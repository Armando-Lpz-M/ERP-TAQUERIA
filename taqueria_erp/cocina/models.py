from django.db import models
from django.utils.translation import gettext_lazy as _

# Create your models here.
class Categoria(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = _("Categoría")
        verbose_name_plural = _("Categorías")
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre

class Ingrediente(models.Model):
    UNIDAD_CHOICES = [
        ("kg", _("Kilogramo")),
        ("g", _("Gramo")),
        ("l", _("Litro")),
        ("ml", _("Mililitro")),
        ("pza", _("Pieza")),
        ("tortilla", _("Tortilla")),
    ]

    nombre = models.CharField(max_length=100)
    unidad = models.CharField(max_length=20, choices=UNIDAD_CHOICES)
    stock_actual = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock_minimo = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = _("Ingrediente")
        verbose_name_plural = _("Ingredientes")
        ordering = ["nombre"]

    def __str__(self):
        return f"{self.nombre} ({self.unidad})"

    @property
    def stock_bajo(self):
        return self.stock_actual <= self.stock_minimo


class Producto(models.Model):
    nombre = models.CharField(max_length=150)
    categoria = models.ForeignKey(Categoria, on_delete=models.SET_NULL, null=True, related_name="productos")
    descripcion = models.TextField(blank=True)
    precio = models.DecimalField(max_digits=8, decimal_places=2)
    imagen = models.ImageField(upload_to="productos/", blank=True, null=True)
    disponible = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Producto")
        verbose_name_plural = _("Productos")
        ordering = ["categoria", "nombre"]

    def __str__(self):
        return self.nombre


class RecetaIngrediente(models.Model):
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name="receta")
    ingrediente = models.ForeignKey(Ingrediente, on_delete=models.CASCADE)
    cantidad = models.DecimalField(max_digits=8, decimal_places=3)

    class Meta:
        verbose_name = _("Ingrediente de receta")
        verbose_name_plural = _("Ingredientes de receta")
        unique_together = ("producto", "ingrediente")

    def __str__(self):
        return f"{self.cantidad} {self.ingrediente.unidad} de {self.ingrediente.nombre} para {self.producto.nombre}"