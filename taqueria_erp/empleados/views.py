from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Empleado, Turno
from .serializers import EmpleadoSerializer, TurnoSerializer
from .permissions import EsAdmin, sincronizar_grupos_rol
from .audit import AuditedViewSetMixin, registrar_evento


class EmpleadoViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    queryset = Empleado.objects.filter(activo=True)
    serializer_class = EmpleadoSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ("nombre", "apellido", "rol")
    permission_classes = [EsAdmin]

    def perform_update(self, serializer):
        previous_role = serializer.instance.rol
        employee = serializer.save()
        sincronizar_grupos_rol(employee)
        if previous_role != employee.rol:
            registrar_evento(
                usuario=self.request.user,
                accion='cambio_rol',
                objeto=employee,
                detalle={'anterior': previous_role, 'nuevo': employee.rol},
                request=self.request,
            )


class TurnoViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    queryset = Turno.objects.all()
    serializer_class = TurnoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ("empleado",)
    permission_classes = [EsAdmin]

    @action(detail=False, methods=["get"], url_path="activos")
    def activos(self, request):
        turnos = Turno.objects.filter(salida__isnull=True)
        return Response(TurnoSerializer(turnos, many=True).data)