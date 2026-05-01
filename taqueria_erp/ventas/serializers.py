from rest_framework import serializers
from .models import Mesa, Orden, ItemOrden, Ticket
from cocina.serializers import ProductoSerializer


class MesaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mesa
        fields = ("id", "numero", "capacidad", "activa")


class ItemOrdenSerializer(serializers.ModelSerializer):
    producto = ProductoSerializer(read_only=True)
    producto_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__("cocina.models", fromlist=["Producto"]).Producto.objects.all(),
        source="producto",
        write_only=True
    )
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ItemOrden
        fields = ("id", "producto", "producto_id", "cantidad", "precio_unitario", "subtotal", "notas")


class OrdenSerializer(serializers.ModelSerializer):
    items = ItemOrdenSerializer(many=True, read_only=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Orden
        fields = ("id", "mesa", "empleado", "estado", "items", "total", "creada", "notas")


class TicketSerializer(serializers.ModelSerializer):
    orden = OrdenSerializer(read_only=True)

    class Meta:
        model = Ticket
        fields = ("id", "orden", "total", "metodo_pago", "pagado_con", "cambio", "fecha")