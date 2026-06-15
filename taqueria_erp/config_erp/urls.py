from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView, RedirectView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    rol = 'admin'
    if hasattr(user, 'empleado'):
        rol = user.empleado.rol
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_superuser': user.is_superuser,
        'rol': rol,
    })


urlpatterns = [
    path('', RedirectView.as_view(url='/login/'), name='home'),
    path('login/', TemplateView.as_view(template_name='login.html'), name='login'),
    path('erp/', TemplateView.as_view(template_name='erp_taqueria.html'), name='erp'),
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/me/', me, name='me'),
    path('api/cocina/', include('cocina.urls')),
    path('api/inventario/', include('inventario.urls')),
    path('api/ventas/', include('ventas.urls')),
    path('api/empleados/', include('empleados.urls')),
    path('api/reportes/', include('reportes.urls')),
]