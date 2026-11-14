from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import ReporteVentaDiariaViewSet, ResumenVentasViewSet

router = DefaultRouter()
router.register(r"ventas-diarias", ReporteVentaDiariaViewSet, basename="reporte-venta-diaria")
router.register(r"resumen", ResumenVentasViewSet, basename="resumen-ventas")

urlpatterns = [
    path("", include(router.urls)),
]