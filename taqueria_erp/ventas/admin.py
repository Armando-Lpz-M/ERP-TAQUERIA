from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import Mesa, Orden, ItemOrden, Ticket


class ItemOrdenInline(TabularInline):
    model = ItemOrden
    extra = 1
    readonly_fields = ("subtotal",)


@admin.register(Mesa)
class MesaAdmin(ModelAdmin):
    list_display = ("numero", "capacidad", "activa")
    list_editable = ("activa",)


@admin.register(Orden)
class OrdenAdmin(ModelAdmin):
    list_display = ("id", "mesa", "empleado", "estado", "total", "creada")
    list_filter = ("estado", "creada")
    search_fields = ("id", "mesa__numero")
    readonly_fields = ("creada", "actualizada", "total")
    inlines = [ItemOrdenInline]


@admin.register(Ticket)
class TicketAdmin(ModelAdmin):
    list_display = ("id", "orden", "total", "metodo_pago", "cambio", "fecha")
    list_filter = ("metodo_pago", "fecha")
    readonly_fields = ("fecha", "cambio")