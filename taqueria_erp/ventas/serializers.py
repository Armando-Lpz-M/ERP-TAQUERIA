from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from cocina.models import Producto
from cocina.serializers import ProductoSerializer

from .models import ItemOrden, Mesa, Orden, Ticket

MAX_CANTIDAD = 999


class MesaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mesa
        fields = ("id", "numero", "capacidad", "activa")


class ItemOrdenSerializer(serializers.ModelSerializer):
    producto = ProductoSerializer(read_only=True)
    producto_id = serializers.PrimaryKeyRelatedField(
        queryset=Producto.objects.filter(disponible=True),
        source="producto",
        write_only=True,
    )
    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    cantidad = serializers.IntegerField(min_value=1, max_value=MAX_CANTIDAD, default=1)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ItemOrden
        fields = ("id", "producto", "producto_id", "producto_nombre", "cantidad", "precio_unitario", "subtotal", "notas")
        # El precio siempre sale del producto, nunca del cliente
        read_only_fields = ("precio_unitario",)


class ItemOrdenUpdateSerializer(serializers.Serializer):
    cantidad = serializers.IntegerField(min_value=1, max_value=MAX_CANTIDAD, required=False)
    notas = serializers.CharField(allow_blank=True, max_length=500, required=False)


class OrdenSerializer(serializers.ModelSerializer):
    items = ItemOrdenSerializer(many=True, required=False)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    estado = serializers.CharField(read_only=True)
    referencia = serializers.CharField(read_only=True)
    mesa_numero = serializers.IntegerField(source="mesa.numero", read_only=True, allow_null=True)
    empleado_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Orden
        fields = (
            "id", "mesa", "mesa_numero", "cliente", "referencia", "empleado", "empleado_nombre",
            "estado", "items", "total", "creada", "actualizada", "notas",
        )
        read_only_fields = ("creada", "actualizada")

    def get_empleado_nombre(self, obj):
        if obj.empleado_id is None:
            return None
        return f"{obj.empleado.nombre} {obj.empleado.apellido}".strip()

    def validate(self, attrs):
        if self.instance is None and not (attrs.get("mesa") or attrs.get("cliente", "").strip() or attrs.get("notas", "").strip()):
            raise serializers.ValidationError({"cliente": "Indica la mesa o el nombre del cliente."})
        if self.instance is not None and "items" in attrs:
            raise serializers.ValidationError({"items": "Usa /items/ para modificar los productos de la orden."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items = validated_data.pop("items", [])
        orden = Orden.objects.create(**validated_data)
        for item in items:
            ItemOrden.objects.create(orden=orden, precio_unitario=item["producto"].precio, **item)
        return orden


class CocinaItemOrdenSerializer(serializers.ModelSerializer):
    producto = serializers.CharField(source='producto.nombre', read_only=True)

    class Meta:
        model = ItemOrden
        fields = ('producto', 'cantidad', 'notas')


class CocinaOrdenSerializer(serializers.ModelSerializer):
    """Vista de cocina: sin precios, totales ni costos."""
    referencia = serializers.CharField(read_only=True)
    items = CocinaItemOrdenSerializer(many=True, read_only=True)

    class Meta:
        model = Orden
        fields = ('id', 'referencia', 'estado', 'items', 'creada', 'actualizada')


class CobroSerializer(serializers.Serializer):
    metodo_pago = serializers.ChoiceField(choices=Ticket.METODO_PAGO_CHOICES, default="efectivo")
    pagado_con = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0"), required=False, allow_null=True
    )


class TicketSerializer(serializers.ModelSerializer):
    orden = OrdenSerializer(read_only=True)

    class Meta:
        model = Ticket
        fields = ("id", "orden", "total", "metodo_pago", "pagado_con", "cambio", "fecha")
