from datetime import datetime, time, timedelta
from decimal import Decimal
from io import BytesIO

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from openpyxl import load_workbook
from rest_framework.test import APIClient

from cocina.models import Categoria, Producto
from empleados.models import Empleado
from ventas.models import ItemOrden, Orden, Ticket

URL = '/api/reportes/resumen/'


def a_las(dia, hora):
    """Fecha y hora local del negocio."""
    return timezone.make_aware(datetime.combine(dia, time(hora, 30)), timezone.get_default_timezone())


@override_settings(SECURE_SSL_REDIRECT=False, AXES_ENABLED=False, TIME_ZONE='America/Mexico_City')
class ResumenVentasTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.admin = User.objects.create_user('jefe', password='x', is_superuser=True)
        self.cajero = User.objects.create_user('caja', password='x')
        Empleado.objects.create(usuario=self.cajero, nombre='Ana', apellido='R', rol='cajero')
        self.mesero = User.objects.create_user('mesero', password='x')
        Empleado.objects.create(usuario=self.mesero, nombre='Luis', apellido='M', rol='mesero')

        tacos = Categoria.objects.create(nombre='Tacos')
        self.pastor = Producto.objects.create(nombre='Pastor', categoria=tacos, precio='18.00')
        self.agua = Producto.objects.create(nombre='Agua', categoria=tacos, precio='20.00')
        self.hoy = timezone.localdate()
        self.ayer = self.hoy - timedelta(days=1)

        # Hoy: 10 pastor en efectivo (14 h) y 1 agua con tarjeta (20 h); ayer: 2 pastor con transferencia
        self.vender([(self.pastor, 10)], 'efectivo', a_las(self.hoy, 14))
        self.vender([(self.agua, 1)], 'tarjeta', a_las(self.hoy, 20))
        self.vender([(self.pastor, 2)], 'transferencia', a_las(self.ayer, 13))
        Orden.objects.create(cliente='Cancelada', estado='cancelada')

    def vender(self, productos, metodo, cuando):
        orden = Orden.objects.create(cliente='X', estado='pagada')
        total = Decimal('0')
        for producto, cantidad in productos:
            ItemOrden.objects.create(orden=orden, producto=producto, cantidad=cantidad, precio_unitario=producto.precio)
            total += Decimal(str(producto.precio)) * cantidad
        ticket = Ticket.objects.create(orden=orden, total=total, metodo_pago=metodo)
        Ticket.objects.filter(pk=ticket.pk).update(fecha=cuando)

    def test_resumen_de_hoy(self):
        self.api.force_authenticate(self.admin)
        res = self.api.get(URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Decimal(res.data['total_ventas']), Decimal('200.00'))
        self.assertEqual(res.data['total_ordenes'], 2)
        self.assertEqual(Decimal(res.data['ticket_promedio']), Decimal('100.00'))
        self.assertEqual(res.data['ordenes_canceladas'], 1)
        self.assertEqual(Decimal(res.data['por_metodo']['efectivo']), Decimal('180.00'))
        self.assertEqual(Decimal(res.data['por_metodo']['transferencia']), Decimal('0'))
        horas = {h['hora']: h['ordenes'] for h in res.data['por_hora']}
        self.assertEqual((horas[14], horas[20], horas[13]), (1, 1, 0))

    def test_rango_incluye_dias_sin_ventas_y_top_por_piezas(self):
        self.api.force_authenticate(self.admin)
        res = self.api.get(URL, {'desde': (self.hoy - timedelta(days=6)).isoformat(), 'hasta': self.hoy.isoformat()})
        self.assertEqual(len(res.data['por_dia']), 7)
        self.assertEqual(Decimal(res.data['total_ventas']), Decimal('236.00'))
        por_dia = {d['fecha']: Decimal(d['total']) for d in res.data['por_dia']}
        self.assertEqual(por_dia[self.ayer.isoformat()], Decimal('36.00'))
        self.assertEqual(por_dia[(self.hoy - timedelta(days=3)).isoformat()], Decimal('0'))
        # Pastor: 12 piezas en 2 renglones; Agua: 1 pieza
        self.assertEqual(res.data['top_productos'][0], {'producto': 'Pastor', 'cantidad': 12, 'total': '216.00'})

    def test_rango_invalido(self):
        self.api.force_authenticate(self.admin)
        self.assertEqual(self.api.get(URL, {'desde': '2026-13-01'}).status_code, 400)
        self.assertEqual(self.api.get(URL, {'desde': self.hoy.isoformat(), 'hasta': self.ayer.isoformat()}).status_code, 400)
        self.assertEqual(self.api.get(URL, {'desde': '2020-01-01', 'hasta': '2026-01-01'}).status_code, 400)

    def test_cajero_solo_ve_hoy_y_no_exporta(self):
        self.api.force_authenticate(self.cajero)
        res = self.api.get(URL, {'desde': self.ayer.isoformat(), 'hasta': self.hoy.isoformat()})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['desde'], self.hoy.isoformat())
        self.assertEqual(Decimal(res.data['total_ventas']), Decimal('200.00'))
        self.assertEqual(self.api.get(f'{URL}excel/').status_code, 403)
        self.assertEqual(self.api.get(f'{URL}pdf/').status_code, 403)

    def test_mesero_no_ve_reportes(self):
        self.api.force_authenticate(self.mesero)
        self.assertEqual(self.api.get(URL).status_code, 403)

    def test_exportar_excel(self):
        self.api.force_authenticate(self.admin)
        res = self.api.get(f'{URL}excel/', {'desde': self.ayer.isoformat(), 'hasta': self.hoy.isoformat()})
        self.assertEqual(res.status_code, 200)
        self.assertIn(f'ventas-{self.ayer.isoformat()}-a-{self.hoy.isoformat()}.xlsx', res['Content-Disposition'])
        wb = load_workbook(BytesIO(res.content))
        self.assertEqual(wb.sheetnames, ['Resumen', 'Por día', 'Productos', 'Tickets'])
        self.assertEqual(float(wb['Resumen']['B3'].value), 236.0)  # ventas totales
        self.assertEqual(wb['Tickets'].max_row, 4)  # encabezado + 3 tickets

    def test_exportar_pdf(self):
        self.api.force_authenticate(self.admin)
        res = self.api.get(f'{URL}pdf/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['Content-Type'], 'application/pdf')
        self.assertTrue(res.content.startswith(b'%PDF'))
