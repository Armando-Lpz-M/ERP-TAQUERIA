"""Exportación del resumen de ventas a Excel y PDF."""
from io import BytesIO

from django.utils import timezone
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

METODO_LABEL = {"efectivo": "Efectivo", "tarjeta": "Tarjeta", "transferencia": "Transferencia"}
MONEDA = '"$"#,##0.00'
AMBAR = "EF9F27"


def nombre_archivo(res, extension):
    if res["desde"] == res["hasta"]:
        return f"ventas-{res['desde'].isoformat()}.{extension}"
    return f"ventas-{res['desde'].isoformat()}-a-{res['hasta'].isoformat()}.{extension}"


def periodo(res):
    if res["desde"] == res["hasta"]:
        return res["desde"].strftime("%d/%m/%Y")
    return f"{res['desde'].strftime('%d/%m/%Y')} al {res['hasta'].strftime('%d/%m/%Y')}"


# ── Excel ────────────────────────────────────────────────────────

def _hoja(wb, titulo, encabezados, filas, monedas=(), primera=False):
    ws = wb.active if primera else wb.create_sheet()
    ws.title = titulo
    ws.append(encabezados)
    for celda in ws[1]:
        celda.font = Font(bold=True, color="1D1508")
        celda.fill = PatternFill("solid", fgColor=AMBAR)
        celda.alignment = Alignment(vertical="center")
    for fila in filas:
        ws.append(list(fila))
    for col in monedas:
        for celda in ws.iter_rows(min_row=2, min_col=col, max_col=col):
            celda[0].number_format = MONEDA
    for i, encabezado in enumerate(encabezados, start=1):
        largo = max([len(str(encabezado))] + [len(str(f[i - 1])) for f in filas if i - 1 < len(f)])
        ws.column_dimensions[get_column_letter(i)].width = min(max(largo + 3, 12), 45)
    ws.freeze_panes = "A2"
    return ws


def excel(res, tickets):
    wb = Workbook()
    _hoja(
        wb,
        "Resumen",
        ["Concepto", "Valor"],
        [
            ("Periodo", periodo(res)),
            ("Ventas totales", res["total_ventas"]),
            ("Órdenes cobradas", res["total_ordenes"]),
            ("Ticket promedio", res["ticket_promedio"]),
            ("Órdenes canceladas", res["ordenes_canceladas"]),
            *[(f"Ventas en {METODO_LABEL[m].lower()}", v) for m, v in res["por_metodo"].items()],
        ],
        primera=True,
    )
    ws = wb["Resumen"]
    for fila in (3, 5, 7, 8, 9):
        ws.cell(row=fila, column=2).number_format = MONEDA

    _hoja(wb, "Por día", ["Fecha", "Órdenes", "Ventas"], [(d["fecha"], d["ordenes"], d["total"]) for d in res["por_dia"]], monedas=(3,))
    for celda in wb["Por día"].iter_rows(min_row=2, min_col=1, max_col=1):
        celda[0].number_format = "DD/MM/YYYY"

    _hoja(
        wb,
        "Productos",
        ["Producto", "Piezas", "Ventas"],
        [(p["producto"], p["cantidad"], p["total"]) for p in res["top_productos"]],
        monedas=(3,),
    )

    filas = []
    for t in tickets.select_related("orden__mesa").order_by("fecha"):
        local = timezone.localtime(t.fecha)
        filas.append((t.pk, local.replace(tzinfo=None), t.orden.referencia, METODO_LABEL.get(t.metodo_pago, t.metodo_pago), t.total))
    _hoja(wb, "Tickets", ["Ticket", "Fecha", "Orden", "Método de pago", "Total"], filas, monedas=(5,))
    for celda in wb["Tickets"].iter_rows(min_row=2, min_col=2, max_col=2):
        celda[0].number_format = "DD/MM/YYYY HH:MM"

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


# ── PDF ──────────────────────────────────────────────────────────

def _dinero(valor):
    return f"${valor:,.2f}"


def _tabla(filas, anchos, alinear_derecha_desde=1):
    tabla = Table(filas, colWidths=anchos, repeatRows=1)
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ef9f27")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1d1508")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#c9c2b3")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7f3ea")]),
        ("ALIGN", (alinear_derecha_desde, 1), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    return tabla


def pdf(res):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm, topMargin=15 * mm, bottomMargin=15 * mm)
    estilos = getSampleStyleSheet()
    ancho = A4[0] - 30 * mm
    contenido = [
        Paragraph("Taquería ERP — Reporte de ventas", estilos["Title"]),
        Paragraph(f"Periodo: {periodo(res)}", estilos["Normal"]),
        Spacer(1, 6 * mm),
        _tabla(
            [
                ["Ventas totales", "Órdenes", "Ticket promedio", "Canceladas"],
                [_dinero(res["total_ventas"]), str(res["total_ordenes"]), _dinero(res["ticket_promedio"]), str(res["ordenes_canceladas"])],
            ],
            [ancho / 4] * 4,
            alinear_derecha_desde=0,
        ),
        Spacer(1, 6 * mm),
        Paragraph("Por método de pago", estilos["Heading3"]),
        _tabla(
            [["Método", "Ventas"]] + [[METODO_LABEL[m], _dinero(v)] for m, v in res["por_metodo"].items()],
            [ancho * 0.6, ancho * 0.4],
        ),
    ]
    if res["top_productos"]:
        contenido += [
            Spacer(1, 6 * mm),
            Paragraph("Productos más vendidos", estilos["Heading3"]),
            _tabla(
                [["Producto", "Piezas", "Ventas"]] + [[p["producto"], str(p["cantidad"]), _dinero(p["total"])] for p in res["top_productos"]],
                [ancho * 0.6, ancho * 0.15, ancho * 0.25],
            ),
        ]
    if len(res["por_dia"]) > 1:
        contenido += [
            Spacer(1, 6 * mm),
            Paragraph("Ventas por día", estilos["Heading3"]),
            _tabla(
                [["Fecha", "Órdenes", "Ventas"]] + [[d["fecha"].strftime("%d/%m/%Y"), str(d["ordenes"]), _dinero(d["total"])] for d in res["por_dia"]],
                [ancho * 0.5, ancho * 0.2, ancho * 0.3],
            ),
        ]
    doc.build(contenido)
    return buffer.getvalue()
