import re

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from config_erp import auth_views
from config_erp.auth_views import datos_usuario
from config_erp.spa import spa


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(datos_usuario(request.user))


# Rutas que NO son del frontend de React
_NO_SPA = '|'.join(re.escape(p) for p in ('api/', 'static/', 'media/', 'i18n/', settings.ADMIN_URL))

urlpatterns = [
    path('i18n/', include('django.conf.urls.i18n')),
    path(settings.ADMIN_URL, admin.site.urls),
    path('api/me/', me, name='me'),
    path('api/auth/login/', auth_views.login, name='auth_login'),
    path('api/auth/refresh/', auth_views.refresh, name='auth_refresh'),
    path('api/auth/logout/', auth_views.logout, name='auth_logout'),
    path('api/cocina/', include('cocina.urls')),
    path('api/inventario/', include('inventario.urls')),
    path('api/ventas/', include('ventas.urls')),
    path('api/empleados/', include('empleados.urls')),
    path('api/reportes/', include('reportes.urls')),
    # Todo lo demás (/, /login, /ordenes/12, …) lo resuelve React Router
    re_path(rf'^(?!{_NO_SPA})(?P<ruta>.*)$', spa, name='spa'),
]
