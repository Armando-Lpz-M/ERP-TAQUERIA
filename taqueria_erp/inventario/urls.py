from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import ProveedorViewSet, EntradaInventarioViewSet, SalidaInventarioViewSet

router = DefaultRouter()
router.register(r"proveedores", ProveedorViewSet, basename="proveedor")
router.register(r"entradas", EntradaInventarioViewSet, basename="entrada")
router.register(r"salidas", SalidaInventarioViewSet, basename="salida")

urlpatterns = [
    path("", include(router.urls)),
]