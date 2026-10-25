from datetime import datetime, time, timedelta
from io import BytesIO

from django.http import HttpResponse
from django.utils.dateparse import parse_date
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from empleados.audit import AuditedViewSetMixin
from .models import ReporteVentaDiaria
from .serializers import ReporteVentaDiariaSerializer
from ventas.models import Ticket, ItemOrden
from empleados.permissions import EsAdmin, EsAdminOCajero, rol_usuario


def get_local_day_bounds(now=None):
    """Return the configured local date and its timezone-aware interval."""
    configured_timezone = timezone.get_default_timezone()
    current_time = now or timezone.now()
    local_date = timezone.localtime(current_time, configured_timezone).date()
    start = timezone.make_aware(datetime.combine(local_date, time.min), configured_timezone)
    end = timezone.make_aware(
        datetime.combine(local_date + timedelta(days=1), time.min),
        configured_timezone,
    )
    return local_date, start, end


class ReporteVentaDiariaViewSet(AuditedViewSetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = ReporteVentaDiaria.objects.all()
    serializer_class = ReporteVentaDiariaSerializer
    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'generar'):
            return [EsAdminOCajero()]
        return [EsAdmin()]

    def get_queryset(self):
        queryset = super().get_queryset()
        if rol_usuario(self.request.user) == 'cajero':
            return queryset.filter(fecha=timezone.localdate())
        return queryset

    @action(detail=False, methods=["post"], url_path="generar")
    def generar(self, request):
        hoy, inicio_dia, fin_dia = get_local_day_bounds()
        tickets = Ticket.objects.filter(fecha__gte=inicio_dia, fecha__lt=fin_dia)
        total_ventas = tickets.aggregate(total=Sum("total"))["total"] or 0
        total_ordenes = tickets.count()
        total_efectivo = tickets.filter(metodo_pago="efectivo").aggregate(t=Sum("total"))["t"] or 0
        total_tarjeta = tickets.filter(metodo_pago="tarjeta").aggregate(t=Sum("total"))["t"] or 0
        total_transferencia = tickets.filter(metodo_pago="transferencia").aggregate(t=Sum("total"))["t"] or 0
        producto_top = (
            ItemOrden.objects.filter(
                orden__ticket__fecha__gte=inicio_dia,
                orden__ticket__fecha__lt=fin_dia,
            )
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

    @action(detail=False, methods=['get'], url_path='pdf')
    def exportar_pdf(self, request):
        reports = self.get_queryset().order_by('-fecha')
        start_date = parse_date(request.query_params.get('fecha_inicio', ''))
        end_date = parse_date(request.query_params.get('fecha_fin', ''))
        if start_date:
            reports = reports.filter(fecha__gte=start_date)
        if end_date:
            reports = reports.filter(fecha__lte=end_date)

        buffer = BytesIO()
        document = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            rightMargin=12 * mm,
            leftMargin=12 * mm,
            topMargin=12 * mm,
            bottomMargin=12 * mm,
        )
        styles = getSampleStyleSheet()
        content = [Paragraph('Taqueria ERP — Sales reports', styles['Title']), Spacer(1, 6 * mm)]
        rows = [[
            'Date', 'Orders', 'Total sales', 'Cash', 'Card', 'Transfer', 'Best seller',
        ]]
        for report in reports:
            rows.append([
                report.fecha.isoformat(),
                str(report.total_ordenes),
                str(report.total_ventas),
                str(report.total_efectivo),
                str(report.total_tarjeta),
                str(report.total_transferencia),
                report.producto_mas_vendido or '—',
            ])

        table = Table(rows, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ef9f27')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1a1300')),
            ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#b8b5ae')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f2eb')]),
            ('ALIGN', (1, 1), (5, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        content.append(table)
        document.build(content)

        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="taqueria-sales-reports.pdf"'
        return response