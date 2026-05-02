from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from empleados.permissions import EsAdmin, EsAdminOCajero
from .models import Proveedor, EntradaInventario, SalidaInventario
from .serializers import ProveedorSerializer, EntradaInventarioSerializer, SalidaInventarioSerializer


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.filter(activo=True)
    serializer_class = ProveedorSerializer
    search_fields = ("nombre",)
    permission_classes = [EsAdmin]


class EntradaInventarioViewSet(viewsets.ModelViewSet):
    queryset = EntradaInventario.objects.all()
    serializer_class = EntradaInventarioSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ("proveedor", "ingrediente")
    search_fields = ("ingrediente__nombre",)
    permission_classes = [EsAdminOCajero]


class SalidaInventarioViewSet(viewsets.ModelViewSet):
    queryset = SalidaInventario.objects.all()
    serializer_class = SalidaInventarioSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ("motivo", "ingrediente")
    search_fields = ("ingrediente__nombre",)
    permission_classes = [EsAdminOCajero]