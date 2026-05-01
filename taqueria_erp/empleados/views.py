from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Empleado, Turno
from .serializers import EmpleadoSerializer, TurnoSerializer


class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.filter(activo=True)
    serializer_class = EmpleadoSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ("nombre", "apellido", "rol")


class TurnoViewSet(viewsets.ModelViewSet):
    queryset = Turno.objects.all()
    serializer_class = TurnoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ("empleado",)

    @action(detail=False, methods=["get"], url_path="activos")
    def activos(self, request):
        """Turnos sin salida registrada (empleados actualmente trabajando)."""
        turnos = Turno.objects.filter(salida__isnull=True)
        serializer = self.get_serializer(turnos, many=True)
        return Response(serializer.data)