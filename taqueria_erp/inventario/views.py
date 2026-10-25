from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from empleados.audit import AuditedViewSetMixin
from empleados.permissions import EsAdmin
from .models import Proveedor, EntradaInventario, SalidaInventario
from .serializers import ProveedorSerializer, EntradaInventarioSerializer, SalidaInventarioSerializer


class ProveedorViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    queryset = Proveedor.objects.filter(activo=True)
    serializer_class = ProveedorSerializer
    search_fields = ("nombre",)
    permission_classes = [EsAdmin]


class EntradaInventarioViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    queryset = EntradaInventario.objects.all()
    serializer_class = EntradaInventarioSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ("proveedor", "ingrediente")
    search_fields = ("ingrediente__nombre",)
    permission_classes = [EsAdmin]


class SalidaInventarioViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    queryset = SalidaInventario.objects.all()
    serializer_class = SalidaInventarioSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ("motivo", "ingrediente")
    search_fields = ("ingrediente__nombre",)
    permission_classes = [EsAdmin]