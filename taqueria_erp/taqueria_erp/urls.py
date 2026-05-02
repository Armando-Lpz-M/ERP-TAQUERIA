from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView, RedirectView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    # Raíz redirige al login
    path('', RedirectView.as_view(url='/login/'), name='home'),
    # Páginas HTML
    path('login/', TemplateView.as_view(template_name='login.html'), name='login'),
    path('erp/', TemplateView.as_view(template_name='erp_taqueria.html'), name='erp'),
    # Admin Django (solo superusuario)
    path('admin/', admin.site.urls),
    # JWT Auth
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # APIs
    path('api/cocina/', include('cocina.urls')),
    path('api/inventario/', include('inventario.urls')),
    path('api/ventas/', include('ventas.urls')),
    path('api/empleados/', include('empleados.urls')),
    path('api/reportes/', include('reportes.urls')),
]