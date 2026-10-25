from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.http import Http404
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from empleados.audit import AuditedViewSetMixin, registrar_evento
from empleados.permissions import (
    EsAdmin,
    EsAdminOCajero,
    EsAdminOCajeroOMesero,
    EsAdminOCajeroOMeseroOCocina,
    EsAdminOCocina,
    EsAdminOMesero,
    rol_usuario,
)
from .models import Mesa, Orden, ItemOrden, Ticket
from .serializers import CocinaOrdenSerializer, MesaSerializer, OrdenSerializer, TicketSerializer


class MesaViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    queryset = Mesa.objects.filter(activa=True)
    serializer_class = MesaSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [EsAdmin()]
        return [EsAdminOCajeroOMesero()]


class OrdenViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    queryset = Orden.objects.all().select_related('mesa', 'empleado__usuario').prefetch_related('items__producto')
    serializer_class = OrdenSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ("estado", "mesa")

    def get_queryset(self):
        queryset = super().get_queryset()
        role = rol_usuario(self.request.user)
        if role == 'mesero':
            try:
                employee = self.request.user.empleado
            except ObjectDoesNotExist:
                return queryset.none()
            return queryset.filter(empleado=employee)
        if role == 'cocina':
            return queryset.filter(estado__in=('abierta', 'en_proceso'))
        return queryset

    def get_object(self):
        try:
            return super().get_object()
        except Http404 as exc:
            if rol_usuario(self.request.user) == 'mesero':
                order_id = self.kwargs.get(self.lookup_field)
                if Orden.objects.filter(pk=order_id).exists():
                    raise PermissionDenied('No puedes acceder a pedidos de otro mesero.') from exc
            raise

    def get_serializer_class(self):
        if rol_usuario(self.request.user) == 'cocina':
            return CocinaOrdenSerializer
        return OrdenSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'abiertas', 'pendientes_cocina'):
            return [EsAdminOCajeroOMeseroOCocina()]
        if self.action == 'create':
            return [EsAdminOCajeroOMesero()]
        if self.action in ('update', 'partial_update'):
            return [EsAdminOMesero()]
        if self.action == 'cerrar':
            return [EsAdminOCajero()]
        if self.action == 'cancelar':
            return [EsAdminOCajeroOMesero()]
        if self.action == 'cambiar_estado':
            return [EsAdminOCocina()]
        if self.action == 'destroy':
            return [EsAdmin()]
        return [EsAdmin()]

    def perform_create(self, serializer):
        if rol_usuario(self.request.user) == 'mesero':
            try:
                employee = self.request.user.empleado
            except ObjectDoesNotExist as exc:
                raise PermissionDenied('El usuario mesero no tiene perfil de empleado.') from exc
            serializer.save(empleado=employee)
            return
        serializer.save()

    def perform_update(self, serializer):
        if rol_usuario(self.request.user) == 'mesero':
            if serializer.instance.estado != 'abierta':
                raise PermissionDenied('Solo puedes editar pedidos propios que sigan abiertos.')
            forbidden_fields = set(serializer.validated_data) - {'mesa', 'notas'}
            if forbidden_fields:
                raise PermissionDenied('Solo puedes actualizar mesa y notas del pedido.')
        if 'estado' in serializer.validated_data:
            raise PermissionDenied('Usa la acción de cambio de estado.')
        serializer.save()

    @action(detail=False, methods=["get"], url_path="abiertas")
    def abiertas(self, request):
        ordenes = self.get_queryset().filter(estado='abierta')
        serializer_class = CocinaOrdenSerializer if rol_usuario(request.user) == 'cocina' else OrdenSerializer
        return Response(serializer_class(ordenes, many=True).data)

    @action(detail=False, methods=['get'], url_path='pendientes-cocina')
    def pendientes_cocina(self, request):
        if rol_usuario(request.user) not in {'admin', 'cocina'}:
            raise PermissionDenied()
        orders = Orden.objects.filter(estado__in=('abierta', 'en_proceso')).select_related('mesa').prefetch_related('items__producto')
        return Response(CocinaOrdenSerializer(orders, many=True).data)

    @action(detail=True, methods=["post"], url_path="cerrar", permission_classes=[EsAdminOCajero])
    def cerrar(self, request, pk=None):
        orden = self.get_object()
        orden.estado = "pagada"
        orden.save()
        ticket = Ticket.objects.create(
            orden=orden,
            total=orden.total,
            metodo_pago=request.data.get("metodo_pago", "efectivo"),
            pagado_con=request.data.get("pagado_con"),
        )
        return Response(TicketSerializer(ticket).data)

    @action(detail=True, methods=['post'], url_path='cancelar')
    def cancelar(self, request, pk=None):
        order = self.get_object()
        role = rol_usuario(request.user)
        if order.estado in {'pagada', 'cancelada'}:
            raise ValidationError('El pedido ya está cerrado.')
        if role == 'mesero' and order.estado == 'en_proceso':
            raise PermissionDenied('Un pedido en preparación solo puede cancelarlo un cajero o el dueño.')
        if role == 'mesero' and order.estado != 'abierta':
            raise PermissionDenied('Solo puedes cancelar pedidos propios que sigan abiertos.')
        previous_state = order.estado
        order.estado = 'cancelada'
        order.save(update_fields=['estado', 'actualizada'])
        registrar_evento(
            usuario=request.user,
            accion='cancelacion_pedido',
            objeto=order,
            detalle={'estado_anterior': previous_state, 'estado_nuevo': order.estado},
            request=request,
        )
        return Response(OrdenSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='cambiar-estado')
    def cambiar_estado(self, request, pk=None):
        order = self.get_object()
        new_state = request.data.get('estado')
        valid_states = {'abierta', 'en_proceso', 'lista'}
        if new_state not in valid_states:
            raise ValidationError({'estado': 'Estado no válido para el flujo de cocina.'})
        old_state = order.estado
        is_owner = rol_usuario(request.user) == 'admin'
        allowed_transitions = {
            'abierta': {'en_proceso'},
            'en_proceso': {'lista'},
        }
        owner_transitions = {
            'abierta': {'en_proceso'},
            'en_proceso': {'abierta', 'lista'},
            'lista': {'en_proceso'},
        }
        permitted_transitions = owner_transitions if is_owner else allowed_transitions
        if new_state not in permitted_transitions.get(old_state, set()):
            raise PermissionDenied('Cocina solo puede avanzar de abierta a en_proceso y de en_proceso a lista.')
        if old_state != new_state:
            order.estado = new_state
            order.save(update_fields=['estado', 'actualizada'])
            registrar_evento(
                usuario=request.user,
                accion='cambio_estado_pedido',
                objeto=order,
                detalle={'anterior': old_state, 'nuevo': new_state},
                request=request,
            )
        return Response(CocinaOrdenSerializer(order).data)


class TicketViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ("metodo_pago",)
    def get_queryset(self):
        queryset = super().get_queryset().select_related('orden__mesa', 'orden__empleado__usuario')
        if rol_usuario(self.request.user) == 'cajero':
            today = timezone.localdate()
            return queryset.filter(fecha__date=today)
        return queryset

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [EsAdminOCajero()]
        return [EsAdmin()]

    @transaction.atomic
    def perform_destroy(self, instance):
        registrar_evento(
            usuario=self.request.user,
            accion='cancelacion_ticket',
            objeto=instance,
            detalle={'total': str(instance.total), 'orden_id': instance.orden_id},
            request=self.request,
        )
        instance.orden.estado = 'cancelada'
        instance.orden.save(update_fields=['estado', 'actualizada'])
        super().perform_destroy(instance)