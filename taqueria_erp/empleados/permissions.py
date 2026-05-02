from rest_framework.permissions import BasePermission

class EsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_superuser or
            hasattr(request.user, 'empleado') and
            request.user.empleado.rol == 'admin'
        )

class EsAdminOCajero(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if hasattr(request.user, 'empleado'):
            return request.user.empleado.rol in ['admin', 'cajero']
        return False

class EsAdminOCajeroOMesero(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if hasattr(request.user, 'empleado'):
            return request.user.empleado.rol in ['admin', 'cajero', 'mesero']
        return False