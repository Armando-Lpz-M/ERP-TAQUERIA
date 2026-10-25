from functools import wraps

from django.contrib.admin.apps import AdminConfig
from django.contrib.admin import AdminSite, ModelAdmin
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import PermissionDenied

from empleados.audit import AuditedModelAdminMixin


def is_erp_owner(user):
    if not user.is_authenticated or not user.is_active or not user.is_staff:
        return False
    if user.is_superuser:
        return True
    try:
        empleado = user.empleado
    except ObjectDoesNotExist:
        empleado = None
    if empleado is not None:
        return empleado.activo and empleado.rol == 'admin'
    return user.groups.filter(name='dueño').exists()


class ERPAdminSite(AdminSite):
    site_header = 'Administración ERP Taquería'
    site_title = 'Administración ERP'
    index_title = 'Gestión exclusiva del dueño'

    def has_permission(self, request):
        return is_erp_owner(request.user)

    def admin_view(self, view, cacheable=False):
        protected_view = super().admin_view(view, cacheable=cacheable)

        @wraps(view)
        def owner_only(request, *args, **kwargs):
            if request.user.is_authenticated and not is_erp_owner(request.user):
                raise PermissionDenied
            return protected_view(request, *args, **kwargs)

        return owner_only

    def register(self, model_or_iterable, admin_class=None, **options):
        admin_class = admin_class or ModelAdmin
        if not issubclass(admin_class, AuditedModelAdminMixin):
            admin_class = type(
                f'Audited{admin_class.__name__}',
                (AuditedModelAdminMixin, admin_class),
                {},
            )
        return super().register(model_or_iterable, admin_class, **options)


class ERPAdminConfig(AdminConfig):
    default_site = 'config_erp.admin.ERPAdminSite'
