from decimal import Decimal

from rest_framework import serializers

from cocina.models import Ingrediente
from cocina.serializers import IngredienteSerializer

from .models import EntradaInventario, Proveedor, SalidaInventario

MINIMO = Decimal("0.01")


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = ("id", "nombre", "contacto", "telefono", "email", "activo")


class EntradaInventarioSerializer(serializers.ModelSerializer):
    ingrediente = IngredienteSerializer(read_only=True)
    ingrediente_id = serializers.PrimaryKeyRelatedField(
        queryset=Ingrediente.objects.filter(activo=True), source="ingrediente", write_only=True
    )
    proveedor = ProveedorSerializer(read_only=True)
    proveedor_id = serializers.PrimaryKeyRelatedField(
        queryset=Proveedor.objects.filter(activo=True),
        source="proveedor",
        write_only=True,
        required=False,
        allow_null=True,
    )
    cantidad = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=MINIMO)
    costo_unitario = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal("0"), default=Decimal("0"))
    costo_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = EntradaInventario
        fields = ("id", "ingrediente", "ingrediente_id", "proveedor", "proveedor_id", "cantidad", "costo_unitario", "costo_total", "fecha", "notas")


class SalidaInventarioSerializer(serializers.ModelSerializer):
    ingrediente = IngredienteSerializer(read_only=True)
    ingrediente_id = serializers.PrimaryKeyRelatedField(
        queryset=Ingrediente.objects.filter(activo=True), source="ingrediente", write_only=True
    )
    cantidad = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=MINIMO)
    # Las salidas por "venta" las registra el cobro automáticamente
    motivo = serializers.ChoiceField(choices=[("merma", "Merma"), ("ajuste", "Ajuste")], default="merma")

    class Meta:
        model = SalidaInventario
        fields = ("id", "ingrediente", "ingrediente_id", "cantidad", "motivo", "fecha", "notas")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["motivo"] = instance.motivo  # incluye "venta" al listar
        return data

    def validate(self, attrs):
        ingrediente = attrs["ingrediente"]
        if attrs["cantidad"] > ingrediente.stock_actual:
            raise serializers.ValidationError(
                {"cantidad": f"Solo hay {ingrediente.stock_actual} {ingrediente.unidad} de {ingrediente.nombre}."}
            )
        return attrs
