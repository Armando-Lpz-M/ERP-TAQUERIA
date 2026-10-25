from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .audit import AuditedModelAdminMixin
from .models import Empleado, EventoAuditoria, Turno


class TurnoInline(TabularInline):
    model = Turno
    extra = 0
    readonly_fields = ("horas_trabajadas",)


@admin.register(Empleado)
class EmpleadoAdmin(AuditedModelAdminMixin, ModelAdmin):
    list_display = ("nombre", "apellido", "rol", "telefono", "activo", "fecha_ingreso")
    list_filter = ("rol", "activo")
    search_fields = ("nombre", "apellido")
    list_editable = ("activo",)
    inlines = [TurnoInline]


@admin.register(Turno)
class TurnoAdmin(AuditedModelAdminMixin, ModelAdmin):
    list_display = ("empleado", "entrada", "salida", "horas_trabajadas")
    list_filter = ("empleado",)
    readonly_fields = ("horas_trabajadas",)


@admin.register(EventoAuditoria)
class EventoAuditoriaAdmin(ModelAdmin):
    list_display = ('creado', 'usuario', 'accion', 'objeto_tipo', 'objeto_id', 'valor_anterior', 'valor_nuevo')
    list_filter = ('accion', 'objeto_tipo', 'creado')
    search_fields = ('usuario__username', 'objeto_tipo', 'objeto_id', 'accion')
    readonly_fields = tuple(field.name for field in EventoAuditoria._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False