from django.db import transaction
from django.db.models import Count, F, Q
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from empleados.audit import AuditedViewSetMixin, registrar_evento
from empleados.permissions import EsAdmin, rol_usuario
from .permissions import EsMenuConsultable
from .models import Categoria, Ingrediente, Producto, RecetaIngrediente
from .serializers import (
    CategoriaSerializer,
    IngredienteSerializer,
    ProductoMenuSerializer,
    ProductoSerializer,
    RecetaSerializer,
)


class BorradoLogicoMixin:
    """DELETE marca el registro como inactivo en vez de borrar su historial."""

    def perform_destroy(self, instance):
        instance.activo = False
        instance.save(update_fields=["activo"])
        registrar_evento(usuario=self.request.user, accion="eliminacion", objeto=instance, request=self.request)


class CategoriaViewSet(BorradoLogicoMixin, AuditedViewSetMixin, viewsets.ModelViewSet):
    queryset = Categoria.objects.filter(activo=True).annotate(total_productos=Count("productos"))
    serializer_class = CategoriaSerializer
    search_fields = ("nombre",)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [EsAdmin()]
        return [EsMenuConsultable()]


class IngredienteViewSet(BorradoLogicoMixin, AuditedViewSetMixin, viewsets.ModelViewSet):
    queryset = Ingrediente.objects.filter(activo=True)
    serializer_class = IngredienteSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ("unidad",)
    search_fields = ("nombre",)

    def get_permissions(self):
        return [EsAdmin()]

    @action(detail=False, methods=["get"], url_path="stock-bajo")
    def stock_bajo(self, request):
        bajos = Ingrediente.objects.filter(activo=True).filter(Q(stock_actual__lte=F("stock_minimo")))
        serializer = self.get_serializer(bajos, many=True)
        return Response(serializer.data)


class ProductoViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    queryset = Producto.objects.select_related("categoria").prefetch_related("receta__ingrediente")
    serializer_class = ProductoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ("categoria", "disponible")
    search_fields = ("nombre",)

    def get_queryset(self):
        queryset = super().get_queryset()
        # El admin ve también los no disponibles para poder reactivarlos
        if rol_usuario(self.request.user) == 'admin':
            return queryset
        return queryset.filter(disponible=True)

    def perform_destroy(self, instance):
        if instance.itemorden_set.exists():
            raise ValidationError('Este producto tiene ventas registradas; márcalo como no disponible en lugar de borrarlo.')
        super().perform_destroy(instance)

    @action(detail=True, methods=['put'], url_path='receta')
    @transaction.atomic
    def receta(self, request, pk=None):
        """Reemplaza la receta: qué ingredientes y cuánto lleva cada pieza."""
        producto = self.get_object()
        serializer = RecetaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        producto.receta.all().delete()
        RecetaIngrediente.objects.bulk_create([
            RecetaIngrediente(producto=producto, ingrediente=item['ingrediente_id'], cantidad=item['cantidad'])
            for item in serializer.validated_data['ingredientes']
        ])
        registrar_evento(
            usuario=request.user,
            accion='cambio_receta',
            objeto=producto,
            detalle={'ingredientes': len(serializer.validated_data['ingredientes'])},
            request=request,
        )
        producto = self.get_queryset().get(pk=producto.pk)
        return Response(ProductoSerializer(producto).data)

    def get_serializer_class(self):
        if rol_usuario(self.request.user) == 'admin':
            return ProductoSerializer
        return ProductoMenuSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'receta']:
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
        categorias = Categoria.objects.filter(activo=True).prefetch_related("productos__categoria", "productos__receta__ingrediente")
        data = []
        for categoria in categorias:
            productos = categoria.productos.filter(disponible=True)
            data.append({
                "categoria": categoria.nombre,
                "productos": self.get_serializer(productos, many=True).data,
            })
        return Response(data)