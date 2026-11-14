"""Cálculo de reportes de ventas a partir de los tickets (siempre en vivo, para cualquier rango)."""
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Sum
from django.db.models.functions import ExtractHour, TruncDate
from django.utils import timezone

from ventas.models import ItemOrden, Orden, Ticket

CERO = Decimal("0.00")
METODOS = ("efectivo", "tarjeta", "transferencia")
MAX_DIAS = 366


def limites(desde: date, hasta: date):
    """Inicio y fin (exclusivo) del rango en la zona horaria del negocio."""
    tz = timezone.get_default_timezone()
    inicio = timezone.make_aware(datetime.combine(desde, time.min), tz)
    fin = timezone.make_aware(datetime.combine(hasta + timedelta(days=1), time.min), tz)
    return inicio, fin


def tickets_del_rango(desde: date, hasta: date):
    inicio, fin = limites(desde, hasta)
    return Ticket.objects.filter(fecha__gte=inicio, fecha__lt=fin)


def resumen(desde: date, hasta: date, top=10):
    tz = timezone.get_default_timezone()
    inicio, fin = limites(desde, hasta)
    tickets = tickets_del_rango(desde, hasta)

    totales = tickets.aggregate(total=Sum("total"), ordenes=Count("id"))
    total = totales["total"] or CERO
    ordenes = totales["ordenes"]

    por_metodo = {m: CERO for m in METODOS}
    for fila in tickets.values("metodo_pago").annotate(total=Sum("total")):
        por_metodo[fila["metodo_pago"]] = fila["total"] or CERO

    # Ventas por día (incluye días sin ventas, para que la gráfica no tenga huecos)
    dias = {
        fila["dia"]: fila
        for fila in tickets.annotate(dia=TruncDate("fecha", tzinfo=tz)).values("dia").annotate(total=Sum("total"), ordenes=Count("id"))
    }
    por_dia = []
    dia = desde
    while dia <= hasta:
        fila = dias.get(dia)
        por_dia.append({"fecha": dia, "total": fila["total"] if fila else CERO, "ordenes": fila["ordenes"] if fila else 0})
        dia += timedelta(days=1)

    # Ventas por hora del día (hora pico)
    horas = {
        fila["hora"]: fila
        for fila in tickets.annotate(hora=ExtractHour("fecha", tzinfo=tz)).values("hora").annotate(total=Sum("total"), ordenes=Count("id"))
    }
    por_hora = [
        {"hora": h, "total": horas[h]["total"] if h in horas else CERO, "ordenes": horas[h]["ordenes"] if h in horas else 0}
        for h in range(24)
    ]

    # Productos más vendidos por piezas (no por renglones)
    subtotal = ExpressionWrapper(F("cantidad") * F("precio_unitario"), output_field=DecimalField(max_digits=12, decimal_places=2))
    top_productos = [
        {"producto": fila["producto__nombre"], "cantidad": fila["piezas"], "total": fila["vendido"]}
        for fila in ItemOrden.objects.filter(orden__ticket__fecha__gte=inicio, orden__ticket__fecha__lt=fin)
        .values("producto__nombre")
        # Alias distintos a las columnas para que F("cantidad") apunte a la columna, no a la suma
        .annotate(piezas=Sum("cantidad"), vendido=Sum(subtotal))
        .order_by("-piezas", "-vendido")[:top]
    ]

    canceladas = Orden.objects.filter(estado="cancelada", actualizada__gte=inicio, actualizada__lt=fin).count()

    return {
        "desde": desde,
        "hasta": hasta,
        "total_ventas": total,
        "total_ordenes": ordenes,
        "ticket_promedio": (total / ordenes).quantize(CERO) if ordenes else CERO,
        "ordenes_canceladas": canceladas,
        "por_metodo": por_metodo,
        "por_dia": por_dia,
        "por_hora": por_hora,
        "top_productos": top_productos,
    }
