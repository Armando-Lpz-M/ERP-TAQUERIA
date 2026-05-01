from django.db import models
from django.contrib.auth.models import User


class Empleado(models.Model):
    ROL_CHOICES = [
        ("taquero", "Taquero"),
        ("mesero", "Mesero"),
        ("cajero", "Cajero"),
        ("admin", "Administrador"),
    ]

    usuario = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    nombre = models.CharField(max_length=150)
    apellido = models.CharField(max_length=150)
    rol = models.CharField(max_length=20, choices=ROL_CHOICES)
    telefono = models.CharField(max_length=20, blank=True)
    activo = models.BooleanField(default=True)
    fecha_ingreso = models.DateField(auto_now_add=True)

    class Meta:
        verbose_name = "Empleado"
        verbose_name_plural = "Empleados"
        ordering = ["apellido", "nombre"]

    def __str__(self):
        return f"{self.nombre} {self.apellido} ({self.rol})"


class Turno(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="turnos")
    entrada = models.DateTimeField()
    salida = models.DateTimeField(null=True, blank=True)
    notas = models.TextField(blank=True)

    class Meta:
        verbose_name = "Turno"
        verbose_name_plural = "Turnos"
        ordering = ["-entrada"]

    def __str__(self):
        return f"{self.empleado} - {self.entrada.date()}"

    @property
    def horas_trabajadas(self):
        if self.salida:
            diff = self.salida - self.entrada
            return round(diff.total_seconds() / 3600, 2)
        return None