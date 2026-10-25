from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from empleados.audit import AuditedViewSetMixin, registrar_evento
from empleados.permissions import EsAdmin, rol_usuario
from .permissions import EsMenuConsultable
from .models import Categoria, Ingrediente, Producto
from .serializers import CategoriaSerializer, IngredienteSerializer, ProductoMenuSerializer, ProductoSerializer


class CategoriaViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    queryset = Categoria.objects.filter(activo=True)
    serializer_class = CategoriaSerializer
    search_fields = ("nombre",)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [EsAdmin()]
        return [EsMenuConsultable()]


class IngredienteViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    queryset = Ingrediente.objects.filter(activo=True)
    serializer_class = IngredienteSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ("unidad",)
    search_fields = ("nombre",)

    def get_permissions(self):
        return [EsAdmin()]

    @action(detail=False, methods=["get"], url_path="stock-bajo")
    def stock_bajo(self, request):
        ingredientes = Ingrediente.objects.filter(activo=True)
        bajos = [i for i in ingredientes if i.stock_bajo]
        serializer = self.get_serializer(bajos, many=True)
        return Response(serializer.data)


class ProductoViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    queryset = Producto.objects.filter(disponible=True)
    serializer_class = ProductoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ("categoria",)
    search_fields = ("nombre",)

    def get_serializer_class(self):
        if rol_usuario(self.request.user) == 'admin':
            return ProductoSerializer
        return ProductoMenuSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [EsAdmin()]
        return [EsMenuConsultable()]

    def perform_update(self, serializer):
        old_price = self.get_object().precio
        product = serializer.save()
        if old_price != product.precio:
            registrar_evento(
                usuario=self.request.user,
                accion='cambio_precio',
                objeto=product,
                anterior=old_price,
                nuevo=product.precio,
                request=self.request,
            )

    @action(detail=False, methods=["get"], url_path="menu")
    def menu(self, request):
        categorias = Categoria.objects.filter(activo=True).prefetch_related("productos")
        data = []
        for categoria in categorias:
            productos = categoria.productos.filter(disponible=True)
            data.append({
                "categoria": categoria.nombre,
                "productos": self.get_serializer(productos, many=True).data,
            })
        return Response(data)