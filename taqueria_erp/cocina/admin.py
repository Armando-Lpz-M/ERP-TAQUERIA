from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import Categoria, Ingrediente, Producto, RecetaIngrediente
# Register your models here.

class RecetaIngredienteInline(TabularInline):
    model = RecetaIngrediente
    extra = 1
    min_num = 1


@admin.register(Categoria)
class CategoriaAdmin(ModelAdmin):
    list_display = ("nombre", "activo")
    list_filter = ("activo",)
    search_fields = ("nombre",)
    list_editable = ("activo",)


@admin.register(Ingrediente)
class IngredienteAdmin(ModelAdmin):
    list_display = ("nombre", "unidad", "stock_actual", "stock_minimo", "stock_bajo", "activo")
    list_filter = ("activo", "unidad")
    search_fields = ("nombre",)
    list_editable = ("activo",)

    @admin.display(boolean=True, description="Stock bajo")
    def stock_bajo(self, obj):
        return obj.stock_bajo


@admin.register(Producto)
class ProductoAdmin(ModelAdmin):
    list_display = ("nombre", "categoria", "precio", "disponible")
    list_filter = ("disponible", "categoria")
    search_fields = ("nombre",)
    list_editable = ("precio", "disponible")
    inlines = [RecetaIngredienteInline]