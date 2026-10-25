from django.conf import settings
from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _


class Empleado(models.Model):
    ROL_CHOICES = [
        ("taquero", _("Taquero")),
        ("mesero", _("Mesero")),
        ("cajero", _("Cajero")),
        ("admin", _("Administrador")),
    ]

    usuario = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    nombre = models.CharField(max_length=150)
    apellido = models.CharField(max_length=150)
    rol = models.CharField(max_length=20, choices=ROL_CHOICES)
    telefono = models.CharField(max_length=20, blank=True)
    activo = models.BooleanField(default=True)
    fecha_ingreso = models.DateField(auto_now_add=True)

    class Meta:
        verbose_name = _("Empleado")
        verbose_name_plural = _("Empleados")
        ordering = ["apellido", "nombre"]

    def __str__(self):
        return f"{self.nombre} {self.apellido} ({self.rol})"


class Turno(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="turnos")
    entrada = models.DateTimeField()
    salida = models.DateTimeField(null=True, blank=True)
    notas = models.TextField(blank=True)

    class Meta:
        verbose_name = _("Turno")
        verbose_name_plural = _("Turnos")
        ordering = ["-entrada"]

    def __str__(self):
        return f"{self.empleado} - {self.entrada.date()}"

    @property
    def horas_trabajadas(self):
        if self.salida:
            diff = self.salida - self.entrada
            return round(diff.total_seconds() / 3600, 2)
        return None


class EventoAuditoria(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='eventos_auditoria',
    )
    accion = models.CharField(max_length=64, db_index=True)
    objeto_tipo = models.CharField(max_length=100, blank=True)
    objeto_id = models.CharField(max_length=64, blank=True)
    valor_anterior = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    valor_nuevo = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    detalle = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-creado']

    def __str__(self):
        return f'{self.accion} {self.objeto_tipo}#{self.objeto_id} ({self.creado})'