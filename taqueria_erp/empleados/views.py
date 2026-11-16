from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Prefetch
from django.utils import timezone
from django_filters import rest_framework as django_filters
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .audit import AuditedViewSetMixin, registrar_evento
from .models import Empleado, Turno
from .permissions import EsAdmin, sincronizar_grupos_rol
from .serializers import AccesoSerializer, EmpleadoSerializer, TurnoSerializer
from .sesiones import revocar_sesiones


def _sincronizar_cuenta(empleado):
    """Grupos según el rol y cuenta bloqueada (con sus sesiones cerradas) si el empleado está inactivo."""
    sincronizar_grupos_rol(empleado)
    user = empleado.usuario
    if user is not None and user.is_active != empleado.activo:
        user.is_active = empleado.activo
        user.save(update_fields=['is_active'])
        if not user.is_active:
            revocar_sesiones(user)


def _proteger_superusuario(empleado, solicitante):
    """Solo un superusuario administra la cuenta de otro superusuario (si no, un admin podría tomar el panel de Django)."""
    usuario = empleado.usuario
    if usuario is not None and usuario.is_superuser and not solicitante.is_superuser:
        raise PermissionDenied('Solo un superusuario puede modificar esta cuenta.')


class EmpleadoViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = EmpleadoSerializer
    filter_backends = [django_filters.DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ("activo", "rol")
    search_fields = ("nombre", "apellido", "rol")
    permission_classes = [EsAdmin]

    def get_queryset(self):
        # Incluye inactivos para poder reactivarlos; ?activo=true filtra
        return Empleado.objects.select_related('usuario').prefetch_related(
            Prefetch('turnos', queryset=Turno.objects.filter(salida__isnull=True), to_attr='turnos_abiertos')
        )

    @transaction.atomic
    def perform_create(self, serializer):
        empleado = serializer.save()
        _sincronizar_cuenta(empleado)

    @transaction.atomic
    def perform_update(self, serializer):
        _proteger_superusuario(serializer.instance, self.request.user)
        previous_role = serializer.instance.rol
        if serializer.validated_data.get('activo') is False and serializer.instance.usuario_id == self.request.user.pk:
            raise ValidationError('No puedes desactivar tu propia cuenta.')
        employee = serializer.save()
        _sincronizar_cuenta(employee)
        if previous_role != employee.rol:
            registrar_evento(
                usuario=self.request.user,
                accion='cambio_rol',
                objeto=employee,
                detalle={'anterior': previous_role, 'nuevo': employee.rol},
                request=self.request,
            )

    @transaction.atomic
    def perform_destroy(self, instance):
        """Borrado lógico: conserva turnos y órdenes, y bloquea su acceso."""
        _proteger_superusuario(instance, self.request.user)
        if instance.usuario_id == self.request.user.pk:
            raise ValidationError('No puedes desactivar tu propia cuenta.')
        instance.activo = False
        instance.save(update_fields=['activo'])
        _sincronizar_cuenta(instance)
        Turno.objects.filter(empleado=instance, salida__isnull=True).update(salida=timezone.now())
        registrar_evento(usuario=self.request.user, accion='baja_empleado', objeto=instance, request=self.request)

    @action(detail=True, methods=['post'], url_path='acceso')
    @transaction.atomic
    def acceso(self, request, pk=None):
        """Crea la cuenta del empleado o le asigna una contraseña nueva (y cierra sus sesiones abiertas)."""
        empleado = self.get_object()
        _proteger_superusuario(empleado, request.user)
        serializer = AccesoSerializer(data=request.data, context={'empleado': empleado})
        serializer.is_valid(raise_exception=True)
        creada = empleado.usuario is None
        if creada:
            empleado.usuario = User.objects.create_user(
                username=serializer.validated_data['username'],
                first_name=empleado.nombre,
                last_name=empleado.apellido,
            )
            empleado.save(update_fields=['usuario'])
        empleado.usuario.set_password(serializer.validated_data['password'])
        empleado.usuario.save(update_fields=['password'])
        if not creada:
            revocar_sesiones(empleado.usuario)
        _sincronizar_cuenta(empleado)
        registrar_evento(
            usuario=request.user,
            accion='alta_acceso' if creada else 'cambio_password',
            objeto=empleado,
            request=request,
        )
        return Response(EmpleadoSerializer(self.get_queryset().get(pk=empleado.pk)).data)

    @action(detail=True, methods=['post'], url_path='entrada')
    def registrar_entrada(self, request, pk=None):
        """Abre un turno ahora."""
        empleado = self.get_object()
        if not empleado.activo:
            raise ValidationError('El empleado está inactivo.')
        if empleado.turnos.filter(salida__isnull=True).exists():
            raise ValidationError('Este empleado ya tiene un turno abierto.')
        turno = Turno.objects.create(empleado=empleado, entrada=timezone.now())
        return Response(TurnoSerializer(turno).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='salida')
    def registrar_salida(self, request, pk=None):
        """Cierra el turno abierto ahora."""
        empleado = self.get_object()
        turno = empleado.turnos.filter(salida__isnull=True).order_by('-entrada').first()
        if turno is None:
            raise ValidationError('Este empleado no tiene un turno abierto.')
        turno.salida = timezone.now()
        turno.save(update_fields=['salida'])
        return Response(TurnoSerializer(turno).data)


class TurnoFilter(django_filters.FilterSet):
    desde = django_filters.DateFilter(field_name='entrada', lookup_expr='date__gte')
    hasta = django_filters.DateFilter(field_name='entrada', lookup_expr='date__lte')

    class Meta:
        model = Turno
        fields = ('empleado', 'desde', 'hasta')


class TurnoViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    queryset = Turno.objects.select_related('empleado__usuario')
    serializer_class = TurnoSerializer
    filter_backends = [django_filters.DjangoFilterBackend]
    filterset_class = TurnoFilter
    permission_classes = [EsAdmin]

    @action(detail=False, methods=["get"], url_path="activos")
    def activos(self, request):
        turnos = self.get_queryset().filter(salida__isnull=True)
        return Response(TurnoSerializer(turnos, many=True).data)
