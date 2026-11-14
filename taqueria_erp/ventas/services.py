"""Reglas de negocio de las órdenes: productos, cobro y descuento de inventario."""
from collections import defaultdict
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from rest_framework.exceptions import PermissionDenied, ValidationError

from cocina.models import Ingrediente
from empleados.audit import registrar_evento
from inventario.models import SalidaInventario

from .models import ItemOrden, Orden, Ticket

ESTADOS_EDITABLES = {"abierta", "en_proceso", "lista"}
CENTAVO = Decimal("0.01")


def validar_orden_editable(orden, rol):
    if orden.estado not in ESTADOS_EDITABLES:
        raise ValidationError("La orden ya está cerrada.")
    if rol == "mesero" and orden.estado != "abierta":
        raise PermissionDenied("Solo puedes modificar pedidos propios que sigan abiertos.")


def _regresar_a_cocina(orden):
    """Si la orden ya estaba lista y le agregan algo, vuelve a preparación para que cocina lo vea."""
    if orden.estado == "lista":
        orden.estado = "en_proceso"
        orden.save(update_fields=["estado", "actualizada"])


@transaction.atomic
def agregar_item(orden, rol, producto, cantidad, notas=""):
    orden = Orden.objects.select_for_update().get(pk=orden.pk)
    validar_orden_editable(orden, rol)
    notas = (notas or "").strip()

    existente = orden.items.filter(producto=producto, notas=notas).first()
    if existente:
        existente.cantidad += cantidad
        existente.save(update_fields=["cantidad"])
    else:
        ItemOrden.objects.create(
            orden=orden, producto=producto, cantidad=cantidad, notas=notas, precio_unitario=producto.precio
        )
    _regresar_a_cocina(orden)
    orden.save(update_fields=["actualizada"])
    return orden


@transaction.atomic
def modificar_item(orden, rol, item_id, datos):
    orden = Orden.objects.select_for_update().get(pk=orden.pk)
    validar_orden_editable(orden, rol)
    item = orden.items.filter(pk=item_id).first()
    if item is None:
        raise ValidationError({"item": "El producto no pertenece a esta orden."})

    campos = []
    if "cantidad" in datos:
        item.cantidad = datos["cantidad"]
        campos.append("cantidad")
    if "notas" in datos:
        item.notas = datos["notas"].strip()
        campos.append("notas")
    if campos:
        item.save(update_fields=campos)
        _regresar_a_cocina(orden)
        orden.save(update_fields=["actualizada"])
    return orden


@transaction.atomic
def quitar_item(orden, rol, item_id):
    orden = Orden.objects.select_for_update().get(pk=orden.pk)
    validar_orden_editable(orden, rol)
    borrados, _ = orden.items.filter(pk=item_id).delete()
    if not borrados:
        raise ValidationError({"item": "El producto no pertenece a esta orden."})
    orden.save(update_fields=["actualizada"])
    return orden


def _descontar_ingredientes(orden, items):
    """Registra una salida de inventario (motivo venta) por cada ingrediente de las recetas."""
    consumo = defaultdict(Decimal)
    for item in items:
        for receta in item.producto.receta.all():
            consumo[receta.ingrediente_id] += receta.cantidad * item.cantidad

    for ingrediente_id in sorted(consumo):
        cantidad = consumo[ingrediente_id].quantize(CENTAVO, rounding=ROUND_HALF_UP)
        if cantidad <= 0:
            continue
        # Bloquea la fila para que dos cobros simultáneos no se pisen el stock
        ingrediente = Ingrediente.objects.select_for_update().get(pk=ingrediente_id)
        SalidaInventario.objects.create(
            ingrediente=ingrediente,
            cantidad=cantidad,
            motivo="venta",
            notas=f"Orden #{orden.pk}",
        )


@transaction.atomic
def cobrar_orden(orden, usuario, metodo_pago, pagado_con=None, request=None):
    orden = Orden.objects.select_for_update().get(pk=orden.pk)
    if orden.estado in {"pagada", "cancelada"}:
        raise ValidationError("La orden ya está cerrada.")

    items = list(orden.items.select_related("producto").prefetch_related("producto__receta"))
    if not items:
        raise ValidationError("La orden no tiene productos.")

    total = sum((item.subtotal for item in items), Decimal("0"))
    if metodo_pago == "efectivo":
        pagado_con = total if pagado_con is None else pagado_con
        if pagado_con < total:
            raise ValidationError({"pagado_con": "El pago es menor al total."})
    else:
        pagado_con = None

    estado_anterior = orden.estado
    orden.estado = "pagada"
    orden.save(update_fields=["estado", "actualizada"])
    ticket = Ticket.objects.create(orden=orden, total=total, metodo_pago=metodo_pago, pagado_con=pagado_con)
    _descontar_ingredientes(orden, items)

    registrar_evento(
        usuario=usuario,
        accion="cobro_orden",
        objeto=orden,
        nuevo=total,
        detalle={"ticket_id": ticket.pk, "metodo_pago": metodo_pago, "estado_anterior": estado_anterior},
        request=request,
    )
    return ticket
