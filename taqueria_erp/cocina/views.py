from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Categoria, Ingrediente, Producto
from .serializers import CategoriaSerializer, IngredienteSerializer, ProductoSerializer


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.filter(activo=True)
    serializer_class = CategoriaSerializer
    search_fields = ("nombre",)


class IngredienteViewSet(viewsets.ModelViewSet):
    queryset = Ingrediente.objects.filter(activo=True)
    serializer_class = IngredienteSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ("unidad",)
    search_fields = ("nombre",)

    @action(detail=False, methods=["get"], url_path="stock-bajo")
    def stock_bajo(self, request):
        """Devuelve ingredientes con stock por debajo del mínimo."""
        ingredientes = Ingrediente.objects.filter(activo=True)
        bajos = [i for i in ingredientes if i.stock_bajo]
        serializer = self.get_serializer(bajos, many=True)
        return Response(serializer.data)


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.filter(disponible=True)
    serializer_class = ProductoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ("categoria",)
    search_fields = ("nombre",)

    @action(detail=False, methods=["get"], url_path="menu")
    def menu(self, request):
        """Devuelve el menú agrupado por categoría."""
        categorias = Categoria.objects.filter(activo=True).prefetch_related(
            "productos"
        )
        data = []
        for categoria in categorias:
            productos = categoria.productos.filter(disponible=True)
            data.append({
                "categoria": categoria.nombre,
                "productos": ProductoSerializer(productos, many=True).data,
            })
        return Response(data)