from django.db import models
from cocina.models import Ingrediente

# Create your models here.
class Proveedor(models.Model):
    nombre = models.CharField(max_length=150)
    contacto = models.CharField(max_length=100, blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Proveedor"
        verbose_name_plural = "Proveedores"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class EntradaInventario(models.Model):
    ingrediente = models.ForeignKey(Ingrediente, on_delete=models.CASCADE, related_name="entradas")
    proveedor = models.ForeignKey(Proveedor, on_delete=models.SET_NULL, null=True, blank=True)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    costo_unitario = models.DecimalField(max_digits=8, decimal_places=2)
    fecha = models.DateTimeField(auto_now_add=True)
    notas = models.TextField(blank=True)

    class Meta:
        verbose_name = "Entrada de inventario"
        verbose_name_plural = "Entradas de inventario"
        ordering = ["-fecha"]

    def __str__(self):
        return f"{self.ingrediente.nombre} +{self.cantidad} ({self.fecha.date()})"

    @property
    def costo_total(self):
        return self.cantidad * self.costo_unitario

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.ingrediente.stock_actual += self.cantidad
        self.ingrediente.save()


class SalidaInventario(models.Model):
    MOTIVO_CHOICES = [
        ("venta", "Venta"),
        ("merma", "Merma"),
        ("ajuste", "Ajuste"),
    ]

    ingrediente = models.ForeignKey(Ingrediente, on_delete=models.CASCADE, related_name="salidas")
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    motivo = models.CharField(max_length=20, choices=MOTIVO_CHOICES, default="venta")
    fecha = models.DateTimeField(auto_now_add=True)
    notas = models.TextField(blank=True)

    class Meta:
        verbose_name = "Salida de inventario"
        verbose_name_plural = "Salidas de inventario"
        ordering = ["-fecha"]

    def __str__(self):
        return f"{self.ingrediente.nombre} -{self.cantidad} ({self.fecha.date()})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.ingrediente.stock_actual -= self.cantidad
        self.ingrediente.save()