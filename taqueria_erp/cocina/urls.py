from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import CategoriaViewSet, IngredienteViewSet, ProductoViewSet

router = DefaultRouter()
router.register(r"categorias", CategoriaViewSet, basename="categoria")
router.register(r"ingredientes", IngredienteViewSet, basename="ingrediente")
router.register(r"productos", ProductoViewSet, basename="producto")

urlpatterns = [
    path("", include(router.urls)),
]