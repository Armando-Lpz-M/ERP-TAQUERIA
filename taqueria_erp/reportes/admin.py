from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import ReporteVentaDiaria


@admin.register(ReporteVentaDiaria)
class ReporteVentaDiariaAdmin(ModelAdmin):
    list_display = ("fecha", "total_ordenes", "total_ventas", "total_efectivo", "total_tarjeta", "producto_mas_vendido")
    list_filter = ("fecha",)
    readonly_fields = ("generado",)