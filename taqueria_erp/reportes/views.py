from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count
from .models import ReporteVentaDiaria
from .serializers import ReporteVentaDiariaSerializer
from ventas.models import Ticket, ItemOrden


class ReporteVentaDiariaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ReporteVentaDiaria.objects.all()
    serializer_class = ReporteVentaDiariaSerializer

    @action(detail=False, methods=["post"], url_path="generar")
    def generar(self, request):
        """Genera o actualiza el reporte del día actual."""
        hoy = timezone.now().date()
        tickets = Ticket.objects.filter(fecha__date=hoy)

        total_ventas = tickets.aggregate(total=Sum("total"))["total"] or 0
        total_ordenes = tickets.count()
        total_efectivo = tickets.filter(metodo_pago="efectivo").aggregate(t=Sum("total"))["t"] or 0
        total_tarjeta = tickets.filter(metodo_pago="tarjeta").aggregate(t=Sum("total"))["t"] or 0
        total_transferencia = tickets.filter(metodo_pago="transferencia").aggregate(t=Sum("total"))["t"] or 0

        # Producto más vendido del día
        producto_top = (
            ItemOrden.objects.filter(orden__ticket__fecha__date=hoy)
            .values("producto__nombre")
            .annotate(total=Count("id"))
            .order_by("-total")
            .first()
        )
        producto_mas_vendido = producto_top["producto__nombre"] if producto_top else ""

        reporte, _ = ReporteVentaDiaria.objects.update_or_create(
            fecha=hoy,
            defaults={
                "total_ventas": total_ventas,
                "total_ordenes": total_ordenes,
                "total_efectivo": total_efectivo,
                "total_tarjeta": total_tarjeta,
                "total_transferencia": total_transferencia,
                "producto_mas_vendido": producto_mas_vendido,
            }
        )
        return Response(ReporteVentaDiariaSerializer(reporte).data)