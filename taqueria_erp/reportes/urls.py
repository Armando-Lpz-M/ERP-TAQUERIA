from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import ReporteVentaDiariaViewSet

router = DefaultRouter()
router.register(r"ventas-diarias", ReporteVentaDiariaViewSet, basename="reporte-venta-diaria")

urlpatterns = [
    path("", include(router.urls)),
]