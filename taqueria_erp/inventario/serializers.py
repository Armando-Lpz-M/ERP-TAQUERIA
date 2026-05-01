from rest_framework import serializers
from .models import Proveedor, EntradaInventario, SalidaInventario
from cocina.serializers import IngredienteSerializer


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = ("id", "nombre", "contacto", "telefono", "email", "activo")


class EntradaInventarioSerializer(serializers.ModelSerializer):
    ingrediente = IngredienteSerializer(read_only=True)
    ingrediente_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__("cocina.models", fromlist=["Ingrediente"]).Ingrediente.objects.all(),
        source="ingrediente",
        write_only=True
    )
    proveedor = ProveedorSerializer(read_only=True)
    proveedor_id = serializers.PrimaryKeyRelatedField(
        queryset=Proveedor.objects.all(), source="proveedor", write_only=True, required=False
    )
    costo_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = EntradaInventario
        fields = ("id", "ingrediente", "ingrediente_id", "proveedor", "proveedor_id", "cantidad", "costo_unitario", "costo_total", "fecha", "notas")


class SalidaInventarioSerializer(serializers.ModelSerializer):
    ingrediente = IngredienteSerializer(read_only=True)
    ingrediente_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__("cocina.models", fromlist=["Ingrediente"]).Ingrediente.objects.all(),
        source="ingrediente",
        write_only=True
    )

    class Meta:
        model = SalidaInventario
        fields = ("id", "ingrediente", "ingrediente_id", "cantidad", "motivo", "fecha", "notas")