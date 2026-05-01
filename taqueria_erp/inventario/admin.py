from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Proveedor, EntradaInventario, SalidaInventario


@admin.register(Proveedor)
class ProveedorAdmin(ModelAdmin):
    list_display = ("nombre", "contacto", "telefono", "email", "activo")
    list_filter = ("activo",)
    search_fields = ("nombre", "contacto")
    list_editable = ("activo",)


@admin.register(EntradaInventario)
class EntradaInventarioAdmin(ModelAdmin):
    list_display = ("ingrediente", "proveedor", "cantidad", "costo_unitario", "costo_total", "fecha")
    list_filter = ("proveedor", "fecha")
    search_fields = ("ingrediente__nombre",)
    readonly_fields = ("fecha",)


@admin.register(SalidaInventario)
class SalidaInventarioAdmin(ModelAdmin):
    list_display = ("ingrediente", "cantidad", "motivo", "fecha")
    list_filter = ("motivo", "fecha")
    search_fields = ("ingrediente__nombre",)
    readonly_fields = ("fecha",)
