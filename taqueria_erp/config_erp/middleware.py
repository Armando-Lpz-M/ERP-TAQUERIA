from empleados.audit import registrar_evento
from django.conf import settings
from django.http import HttpResponseForbidden
from empleados.permissions import es_dueno


class AdminOwnerOnlyMiddleware:
    """Return 403 to authenticated non-owners on every private admin route."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        admin_prefix = f'/{settings.ADMIN_URL.strip("/")}/'
        if request.path.startswith(admin_prefix) and request.user.is_authenticated and not is_dueno_staff(request.user):
            return HttpResponseForbidden()
        return self.get_response(request)


def is_dueno_staff(user):
    return user.is_staff and es_dueno(user)


class AuditoriaAccesosDenegadosMiddleware:
    """Audit authentication/permission denials without interrupting responses."""

    DENIED_STATUSES = {401, 403}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        admin_prefix = f'/{settings.ADMIN_URL.strip("/")}/'
        admin_login_redirect = request.path.startswith(admin_prefix) and response.status_code in {301, 302}
        if response.status_code in self.DENIED_STATUSES or admin_login_redirect:
            try:
                registrar_evento(
                    usuario=getattr(request, 'user', None),
                    accion='acceso_denegado',
                    detalle={'path': request.path, 'method': request.method, 'status': response.status_code},
                    request=request,
                )
            except Exception:
                # Audit storage must not turn an authorization denial into a 500.
                pass
        return response
