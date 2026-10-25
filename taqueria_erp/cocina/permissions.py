from rest_framework.permissions import BasePermission

from empleados.permissions import rol_usuario


class EsMenuConsultable(BasePermission):
    def has_permission(self, request, view):
        return rol_usuario(request.user) in {'admin', 'cajero', 'mesero'}
