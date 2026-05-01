from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import MesaViewSet, OrdenViewSet, TicketViewSet

router = DefaultRouter()
router.register(r"mesas", MesaViewSet, basename="mesa")
router.register(r"ordenes", OrdenViewSet, basename="orden")
router.register(r"tickets", TicketViewSet, basename="ticket")

urlpatterns = [
    path("", include(router.urls)),
]