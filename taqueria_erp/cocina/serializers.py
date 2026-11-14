from decimal import Decimal

from rest_framework import serializers

from .models import Categoria, Ingrediente, Producto, RecetaIngrediente


class CategoriaSerializer(serializers.ModelSerializer):
    total_productos = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Categoria
        fields = ("id", "nombre", "descripcion", "activo", "total_productos")


class IngredienteSerializer(serializers.ModelSerializer):
    stock_bajo = serializers.BooleanField(read_only=True)
    stock_actual = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0"), required=False)
    stock_minimo = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0"), required=False)

    class Meta:
        model = Ingrediente
        fields = ("id", "nombre", "unidad", "stock_actual", "stock_minimo", "stock_bajo", "activo")

    def validate(self, attrs):
        # El stock solo se fija al crear; después cambia con entradas y salidas (quedan registradas)
        if self.instance is not None and "stock_actual" in attrs and attrs["stock_actual"] != self.instance.stock_actual:
            raise serializers.ValidationError({"stock_actual": "Usa una entrada o salida de inventario para cambiar el stock."})
        return attrs


class RecetaIngredienteSerializer(serializers.ModelSerializer):
    ingrediente = IngredienteSerializer(read_only=True)
    ingrediente_id = serializers.PrimaryKeyRelatedField(
        queryset=Ingrediente.objects.all(), source="ingrediente", write_only=True
    )

    class Meta:
        model = RecetaIngrediente
        fields = ("id", "ingrediente", "ingrediente_id", "cantidad")


class ProductoSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    categoria_id = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.filter(activo=True), source="categoria", write_only=True
    )
    precio = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal("0.01"))
    receta = RecetaIngredienteSerializer(many=True, read_only=True)

    class Meta:
        model = Producto
        fields = ("id", "nombre", "categoria", "categoria_id", "descripcion", "precio", "imagen", "disponible", "receta")


class ProductoMenuSerializer(serializers.ModelSerializer):
    categoria = serializers.CharField(source='categoria.nombre', read_only=True, allow_null=True)

    class Meta:
        model = Producto
        fields = ('id', 'nombre', 'categoria', 'precio', 'disponible')

class RecetaItemSerializer(serializers.Serializer):
    ingrediente_id = serializers.PrimaryKeyRelatedField(queryset=Ingrediente.objects.filter(activo=True))
    cantidad = serializers.DecimalField(max_digits=8, decimal_places=3, min_value=Decimal("0.001"))


class RecetaSerializer(serializers.Serializer):
    """Reemplaza la receta completa de un producto."""
    ingredientes = RecetaItemSerializer(many=True)

    def validate_ingredientes(self, value):
        ids = [item["ingrediente_id"].pk for item in value]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Cada ingrediente debe aparecer una sola vez.")
        return value
