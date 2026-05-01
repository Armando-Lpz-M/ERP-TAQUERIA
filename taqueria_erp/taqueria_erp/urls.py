from django.views.generic import TemplateView
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
    path('admin/', admin.site.urls),
    path("api/cocina/", include("cocina.urls")),
    path("api/inventario/", include("inventario.urls")),
    path("api/ventas/", include("ventas.urls")),
    path("api/empleados/", include("empleados.urls")),
    path("api/reportes/", include("reportes.urls")),
    
]
