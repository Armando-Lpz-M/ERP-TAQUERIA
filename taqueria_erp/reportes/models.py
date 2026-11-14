from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


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
        verbose_name = _("Reporte de venta diaria")
        verbose_name_plural = _("Reportes de ventas diarias")
        ordering = ["-fecha"]

    def __str__(self):
        return f"Reporte {self.fecha} - ${self.total_ventas}"