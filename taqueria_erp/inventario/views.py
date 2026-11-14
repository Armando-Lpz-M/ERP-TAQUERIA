from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, viewsets
from rest_framework.pagination import LimitOffsetPagination

from empleados.audit import AuditedViewSetMixin, registrar_evento
from empleados.permissions import EsAdmin

from .models import EntradaInventario, Proveedor, SalidaInventario
from .serializers import EntradaInventarioSerializer, ProveedorSerializer, SalidaInventarioSerializer


class MovimientosPagination(LimitOffsetPagination):
    default_limit = 50
    max_limit = 200


class ProveedorViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    queryset = Proveedor.objects.filter(activo=True)
    serializer_class = ProveedorSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ("nombre",)
    permission_classes = [EsAdmin]

    def perform_destroy(self, instance):
        # Borrado lógico: las entradas pasadas conservan su proveedor
        instance.activo = False
        instance.save(update_fields=["activo"])
        registrar_evento(usuario=self.request.user, accion="eliminacion", objeto=instance, request=self.request)


class _MovimientoViewSet(
    AuditedViewSetMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Los movimientos no se editan ni se borran: un error se corrige con un ajuste."""

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ("ingrediente__nombre", "notas")
    ordering = ("-fecha",)
    pagination_class = MovimientosPagination
    permission_classes = [EsAdmin]


class EntradaInventarioViewSet(_MovimientoViewSet):
    queryset = EntradaInventario.objects.select_related("ingrediente", "proveedor")
    serializer_class = EntradaInventarioSerializer
    filterset_fields = ("proveedor", "ingrediente")


class SalidaInventarioViewSet(_MovimientoViewSet):
    queryset = SalidaInventario.objects.select_related("ingrediente")
    serializer_class = SalidaInventarioSerializer
    filterset_fields = ("motivo", "ingrediente")
