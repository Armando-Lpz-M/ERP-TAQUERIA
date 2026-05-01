from django.db import models
from django.utils import timezone


class ReporteVentaDiaria(models.Model):
    fecha = models.DateField(unique=True, default=timezone.now)
    total_ventas = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_ordenes = models.PositiveIntegerField(default=0)
    total_efectivo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_tarjeta = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_transferencia = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    producto_mas_vendido = models.CharField(max_length=150, blank=True)
    generado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Reporte de venta diaria"
        verbose_name_plural = "Reportes de ventas diarias"
        ordering = ["-fecha"]

    def __str__(self):
        return f"Reporte {self.fecha} - ${self.total_ventas}"