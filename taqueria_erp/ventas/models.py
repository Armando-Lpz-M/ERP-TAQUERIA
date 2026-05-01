from django.db import models
from cocina.models import Producto
from empleados.models import Empleado


class Mesa(models.Model):
    numero = models.PositiveIntegerField(unique=True)
    capacidad = models.PositiveIntegerField(default=4)
    activa = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Mesa"
        verbose_name_plural = "Mesas"
        ordering = ["numero"]

    def __str__(self):
        return f"Mesa {self.numero}"


class Orden(models.Model):
    ESTADO_CHOICES = [
        ("abierta", "Abierta"),
        ("en_proceso", "En proceso"),
        ("lista", "Lista"),
        ("pagada", "Pagada"),
        ("cancelada", "Cancelada"),
    ]

    mesa = models.ForeignKey(Mesa, on_delete=models.SET_NULL, null=True, blank=True)
    empleado = models.ForeignKey(Empleado, on_delete=models.SET_NULL, null=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="abierta")
    creada = models.DateTimeField(auto_now_add=True)
    actualizada = models.DateTimeField(auto_now=True)
    notas = models.TextField(blank=True)

    class Meta:
        verbose_name = "Orden"
        verbose_name_plural = "Órdenes"
        ordering = ["-creada"]

    def __str__(self):
        return f"Orden #{self.id} - {self.estado}"

    @property
    def total(self):
        return sum(item.subtotal for item in self.items.all())


class ItemOrden(models.Model):
    orden = models.ForeignKey(Orden, on_delete=models.CASCADE, related_name="items")
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=8, decimal_places=2)
    notas = models.TextField(blank=True)

    class Meta:
        verbose_name = "Item de orden"
        verbose_name_plural = "Items de orden"

    def __str__(self):
        return f"{self.cantidad}x {self.producto.nombre}"

    @property
    def subtotal(self):
        return self.cantidad * self.precio_unitario

    def save(self, *args, **kwargs):
        if not self.precio_unitario:
            self.precio_unitario = self.producto.precio
        super().save(*args, **kwargs)


class Ticket(models.Model):
    METODO_PAGO_CHOICES = [
        ("efectivo", "Efectivo"),
        ("tarjeta", "Tarjeta"),
        ("transferencia", "Transferencia"),
    ]

    orden = models.OneToOneField(Orden, on_delete=models.CASCADE, related_name="ticket")
    total = models.DecimalField(max_digits=10, decimal_places=2)
    metodo_pago = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES, default="efectivo")
    pagado_con = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cambio = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Ticket"
        verbose_name_plural = "Tickets"
        ordering = ["-fecha"]

    def __str__(self):
        return f"Ticket #{self.id} - ${self.total}"

    def save(self, *args, **kwargs):
        if self.pagado_con and self.metodo_pago == "efectivo":
            self.cambio = self.pagado_con - self.total
        super().save(*args, **kwargs)