from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import Empleado, Turno


class TurnoInline(TabularInline):
    model = Turno
    extra = 0
    readonly_fields = ("horas_trabajadas",)


@admin.register(Empleado)
class EmpleadoAdmin(ModelAdmin):
    list_display = ("nombre", "apellido", "rol", "telefono", "activo", "fecha_ingreso")
    list_filter = ("rol", "activo")
    search_fields = ("nombre", "apellido")
    list_editable = ("activo",)
    inlines = [TurnoInline]


@admin.register(Turno)
class TurnoAdmin(ModelAdmin):
    list_display = ("empleado", "entrada", "salida", "horas_trabajadas")
    list_filter = ("empleado",)
    readonly_fields = ("horas_trabajadas",)