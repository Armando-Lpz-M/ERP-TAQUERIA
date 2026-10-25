from rest_framework.permissions import BasePermission
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.models import Group


ERP_GROUP_NAMES = ('dueño', 'cajero', 'mesero', 'cocina')
ROLE_TO_GROUP = {'admin': 'dueño', 'cajero': 'cajero', 'mesero': 'mesero', 'taquero': 'cocina'}


def sincronizar_grupos_rol(empleado):
    """Synchronize an employee role to the confirmed, idempotent Django group mapping."""
    user = empleado.usuario
    if user is None:
        return
    mapped_group = ROLE_TO_GROUP.get(empleado.rol) if empleado.activo else None
    groups = list(user.groups.exclude(name__in=ERP_GROUP_NAMES))
    if mapped_group:
        role_group, _ = Group.objects.get_or_create(name=mapped_group)
        groups.append(role_group)
    user.groups.set(groups)
    if not user.is_superuser:
        user.is_staff = bool(mapped_group == 'dueño')
        user.save(update_fields=['is_staff'])


def rol_usuario(user):
    if not user or not user.is_authenticated or not user.is_active:
        return None
    if user.is_superuser:
        return 'admin'
    try:
        empleado = user.empleado
    except ObjectDoesNotExist:
        empleado = None
    if empleado is not None:
        if not empleado.activo:
            return None
        if empleado.rol == 'admin':
            return 'admin'
        return {'taquero': 'cocina'}.get(empleado.rol, empleado.rol)
    if user.groups.filter(name='dueño').exists():
        return 'admin'
    if user.groups.filter(name='cocina').exists():
        return 'cocina'
    if user.groups.filter(name='cajero').exists():
        return 'cajero'
    if user.groups.filter(name='mesero').exists():
        return 'mesero'
    return None


def es_dueno(user):
    return rol_usuario(user) == 'admin'


class EsAdmin(BasePermission):
    def has_permission(self, request, view):
        return es_dueno(request.user)

class EsAdminOCajero(BasePermission):
    def has_permission(self, request, view):
        return rol_usuario(request.user) in {'admin', 'cajero'}

class EsAdminOCajeroOMesero(BasePermission):
    def has_permission(self, request, view):
        return rol_usuario(request.user) in {'admin', 'cajero', 'mesero'}


class EsCocina(BasePermission):
    def has_permission(self, request, view):
        return rol_usuario(request.user) in {'admin', 'cocina'}


class EsAdminOCajeroOCocina(BasePermission):
    def has_permission(self, request, view):
        return rol_usuario(request.user) in {'admin', 'cajero', 'cocina'}


class EsAdminOCajeroOMeseroOCocina(BasePermission):
    def has_permission(self, request, view):
        return rol_usuario(request.user) in {'admin', 'cajero', 'mesero', 'cocina'}


class EsAdminOCocina(BasePermission):
    def has_permission(self, request, view):
        return rol_usuario(request.user) in {'admin', 'cocina'}


class EsAdminOMesero(BasePermission):
    def has_permission(self, request, view):
        return rol_usuario(request.user) in {'admin', 'mesero'}