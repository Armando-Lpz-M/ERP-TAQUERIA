from rest_framework import serializers
from .models import Categoria, Ingrediente, Producto, RecetaIngrediente


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ("id", "nombre", "descripcion", "activo")


class IngredienteSerializer(serializers.ModelSerializer):
    stock_bajo = serializers.BooleanField(read_only=True)

    class Meta:
        model = Ingrediente
        fields = ("id", "nombre", "unidad", "stock_actual", "stock_minimo", "stock_bajo", "activo")


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
        queryset=Categoria.objects.all(), source="categoria", write_only=True
    )
    receta = RecetaIngredienteSerializer(many=True, read_only=True)

    class Meta:
        model = Producto
        fields = ("id", "nombre", "categoria", "categoria_id", "descripcion", "precio", "imagen", "disponible", "receta")