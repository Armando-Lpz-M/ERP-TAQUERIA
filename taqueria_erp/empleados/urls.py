from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import EmpleadoViewSet, TurnoViewSet

router = DefaultRouter()
router.register(r"empleados", EmpleadoViewSet, basename="empleado")
router.register(r"turnos", TurnoViewSet, basename="turno")

urlpatterns = [
    path("", include(router.urls)),
]