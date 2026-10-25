from django.contrib import admin
from django.conf import settings
from django.contrib.auth import login as django_login
from django.contrib.auth.mixins import LoginRequiredMixin, PermissionRequiredMixin
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST
from django.urls import path, include
from django.views.generic import TemplateView, RedirectView
from django.views.i18n import JavaScriptCatalog
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.authentication import JWTAuthentication
from empleados.permissions import rol_usuario


class ERPAccessView(LoginRequiredMixin, PermissionRequiredMixin, TemplateView):
    template_name = 'erp_taqueria.html'
    login_url = 'login'
    permission_required = ('auth.view_user',)

    def handle_no_permission(self):
        if self.request.user.is_authenticated:
            from django.core.exceptions import PermissionDenied

            raise PermissionDenied
        return super().handle_no_permission()

    def has_permission(self):
        return rol_usuario(self.request.user) in {'admin', 'cajero', 'mesero', 'cocina'}

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['currency_code'] = settings.CURRENCY_CODE
        context['time_zone'] = settings.TIME_ZONE
        return context


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    rol = rol_usuario(user)
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_superuser': user.is_superuser,
        'rol': rol,
        'permisos': {
            'admin': ['*'],
            'cajero': ['ordenes:create', 'ordenes:close', 'ventas:day', 'menu:read'],
            'mesero': ['ordenes:create', 'ordenes:own:update', 'menu:read'],
            'cocina': ['ordenes:kitchen:read', 'ordenes:kitchen:advance'],
        }.get(rol, []),
    })


@csrf_protect
@require_POST
def establish_session(request):
    """Exchange a valid access token for a Django browser session."""
    authentication = JWTAuthentication()
    authenticated = authentication.authenticate(request)
    if authenticated is None:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)
    user, _token = authenticated
    role = rol_usuario(user)
    if role not in {'admin', 'cajero', 'mesero', 'cocina'}:
        return JsonResponse({'detail': 'This account has no active ERP role.'}, status=403)
    django_login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    return JsonResponse({'role': role})


urlpatterns = [
    path('', RedirectView.as_view(url='/login/'), name='home'),
    path('login/', TemplateView.as_view(template_name='login.html'), name='login'),
    path('erp/', ERPAccessView.as_view(), name='erp'),
    path('jsi18n/', JavaScriptCatalog.as_view(domain='djangojs'), name='javascript-catalog'),
    path('i18n/', include('django.conf.urls.i18n')),
    path(settings.ADMIN_URL, admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/me/', me, name='me'),
    path('api/session-login/', establish_session, name='session_login'),
    path('api/cocina/', include('cocina.urls')),
    path('api/inventario/', include('inventario.urls')),
    path('api/ventas/', include('ventas.urls')),
    path('api/empleados/', include('empleados.urls')),
    path('api/reportes/', include('reportes.urls')),
]