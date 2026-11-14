from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from cocina.models import Categoria, Ingrediente, Producto, RecetaIngrediente
from empleados.models import Empleado, EventoAuditoria
from inventario.models import SalidaInventario

from .models import ItemOrden, Mesa, Orden, Ticket


@override_settings(SECURE_SSL_REDIRECT=False, AXES_ENABLED=False)
class FlujoOrdenesTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.usuarios = {}
        for username, rol in {'jefe': 'admin', 'caja': 'cajero', 'mesero': 'mesero', 'mesero2': 'mesero', 'cocina': 'taquero'}.items():
            user = User.objects.create_user(username=username, password='test-only')
            empleado = Empleado.objects.create(usuario=user, nombre=username, apellido='Test', rol=rol)
            cls.usuarios[username] = (user, empleado)

        tacos = Categoria.objects.create(nombre='Tacos')
        cls.pastor = Producto.objects.create(nombre='Taco al pastor', categoria=tacos, precio='18.00')
        cls.bistec = Producto.objects.create(nombre='Taco de bistec', categoria=tacos, precio='20.00')
        cls.agotado = Producto.objects.create(nombre='Taco agotado', categoria=tacos, precio='10.00', disponible=False)

        cls.tortilla = Ingrediente.objects.create(nombre='Tortilla', unidad='pza', stock_actual='100')
        cls.carne = Ingrediente.objects.create(nombre='Carne', unidad='kg', stock_actual='5.00')
        RecetaIngrediente.objects.create(producto=cls.pastor, ingrediente=cls.tortilla, cantidad='2')
        RecetaIngrediente.objects.create(producto=cls.pastor, ingrediente=cls.carne, cantidad='0.080')
        RecetaIngrediente.objects.create(producto=cls.bistec, ingrediente=cls.tortilla, cantidad='2')
        RecetaIngrediente.objects.create(producto=cls.bistec, ingrediente=cls.carne, cantidad='0.100')
        cls.mesa = Mesa.objects.create(numero=4)

    def setUp(self):
        self.api = APIClient()

    def como(self, username):
        self.api.force_authenticate(user=self.usuarios[username][0])

    def crear_orden(self, **datos):
        datos.setdefault('cliente', 'Juan')
        return self.api.post('/api/ventas/ordenes/', datos, format='json')

    # ── Crear y modificar productos ──────────────────────────────

    def test_crear_orden_con_productos_usa_el_precio_del_servidor(self):
        self.como('mesero')
        res = self.crear_orden(items=[
            {'producto_id': self.pastor.pk, 'cantidad': 3, 'precio_unitario': '0.01'},
            {'producto_id': self.bistec.pk, 'cantidad': 1, 'notas': 'sin cebolla'},
        ])
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(Decimal(res.data['total']), Decimal('74.00'))
        self.assertEqual(res.data['referencia'], 'Juan')
        self.assertEqual(res.data['empleado'], self.usuarios['mesero'][1].pk)
        self.assertEqual({i['precio_unitario'] for i in res.data['items']}, {'18.00', '20.00'})

    def test_crear_orden_requiere_mesa_o_cliente(self):
        self.como('caja')
        res = self.api.post('/api/ventas/ordenes/', {}, format='json')
        self.assertEqual(res.status_code, 400)
        res = self.api.post('/api/ventas/ordenes/', {'mesa': self.mesa.pk}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['referencia'], 'Mesa 4')

    def test_no_se_puede_pedir_un_producto_no_disponible(self):
        self.como('caja')
        res = self.crear_orden(items=[{'producto_id': self.agotado.pk, 'cantidad': 1}])
        self.assertEqual(res.status_code, 400)

    def test_agregar_el_mismo_producto_suma_cantidad(self):
        self.como('mesero')
        orden_id = self.crear_orden().data['id']
        self.api.post(f'/api/ventas/ordenes/{orden_id}/items/', {'producto_id': self.pastor.pk, 'cantidad': 2}, format='json')
        res = self.api.post(f'/api/ventas/ordenes/{orden_id}/items/', {'producto_id': self.pastor.pk}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['items']), 1)
        self.assertEqual(res.data['items'][0]['cantidad'], 3)
        # Con notas distintas es otro renglón (ej. "sin cebolla")
        res = self.api.post(
            f'/api/ventas/ordenes/{orden_id}/items/', {'producto_id': self.pastor.pk, 'notas': 'sin cebolla'}, format='json'
        )
        self.assertEqual(len(res.data['items']), 2)

    def test_cambiar_cantidad_y_quitar_producto(self):
        self.como('caja')
        orden = self.crear_orden(items=[{'producto_id': self.pastor.pk, 'cantidad': 1}]).data
        item_id = orden['items'][0]['id']
        res = self.api.patch(f"/api/ventas/ordenes/{orden['id']}/items/{item_id}/", {'cantidad': 5}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Decimal(res.data['total']), Decimal('90.00'))
        self.assertEqual(
            self.api.patch(f"/api/ventas/ordenes/{orden['id']}/items/{item_id}/", {'cantidad': 0}, format='json').status_code,
            400,
        )
        res = self.api.delete(f"/api/ventas/ordenes/{orden['id']}/items/{item_id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['items'], [])

    def test_no_se_puede_tocar_un_producto_de_otra_orden(self):
        self.como('caja')
        a = self.crear_orden(items=[{'producto_id': self.pastor.pk}]).data
        b = self.crear_orden(cliente='Ana').data
        res = self.api.delete(f"/api/ventas/ordenes/{b['id']}/items/{a['items'][0]['id']}/")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(ItemOrden.objects.filter(orden_id=a['id']).count(), 1)

    def test_mesero_solo_modifica_sus_ordenes_abiertas(self):
        self.como('mesero2')
        ajena = self.crear_orden().data['id']
        self.como('mesero')
        res = self.api.post(f'/api/ventas/ordenes/{ajena}/items/', {'producto_id': self.pastor.pk}, format='json')
        self.assertEqual(res.status_code, 403)

        propia = self.crear_orden().data['id']
        Orden.objects.filter(pk=propia).update(estado='en_proceso')
        res = self.api.post(f'/api/ventas/ordenes/{propia}/items/', {'producto_id': self.pastor.pk}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_agregar_a_orden_lista_la_regresa_a_cocina(self):
        self.como('caja')
        orden_id = self.crear_orden(items=[{'producto_id': self.pastor.pk}]).data['id']
        Orden.objects.filter(pk=orden_id).update(estado='lista')
        res = self.api.post(f'/api/ventas/ordenes/{orden_id}/items/', {'producto_id': self.bistec.pk}, format='json')
        self.assertEqual(res.data['estado'], 'en_proceso')

    def test_cocina_no_puede_agregar_productos(self):
        self.como('caja')
        orden_id = self.crear_orden().data['id']
        self.como('cocina')
        res = self.api.post(f'/api/ventas/ordenes/{orden_id}/items/', {'producto_id': self.pastor.pk}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_activas_excluye_pagadas_y_canceladas(self):
        self.como('caja')
        ids = [self.crear_orden(cliente=f'C{i}').data['id'] for i in range(4)]
        Orden.objects.filter(pk=ids[1]).update(estado='pagada')
        Orden.objects.filter(pk=ids[2]).update(estado='cancelada')
        Orden.objects.filter(pk=ids[3]).update(estado='lista')
        res = self.api.get('/api/ventas/ordenes/activas/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual({o['id'] for o in res.data}, {ids[0], ids[3]})

    # ── Cobro ────────────────────────────────────────────────────

    def test_cobro_en_efectivo_calcula_total_cambio_y_descuenta_ingredientes(self):
        self.como('caja')
        orden_id = self.crear_orden(items=[
            {'producto_id': self.pastor.pk, 'cantidad': 3},
            {'producto_id': self.bistec.pk, 'cantidad': 2},
        ]).data['id']
        res = self.api.post(f'/api/ventas/ordenes/{orden_id}/cerrar/', {'metodo_pago': 'efectivo', 'pagado_con': '100'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(Decimal(res.data['total']), Decimal('94.00'))
        self.assertEqual(Decimal(res.data['cambio']), Decimal('6.00'))
        self.assertEqual(res.data['orden']['estado'], 'pagada')

        # 5 tacos x 2 tortillas = 10 ; carne 3x0.080 + 2x0.100 = 0.44
        self.tortilla.refresh_from_db()
        self.carne.refresh_from_db()
        self.assertEqual(self.tortilla.stock_actual, Decimal('90.00'))
        self.assertEqual(self.carne.stock_actual, Decimal('4.56'))
        self.assertEqual(SalidaInventario.objects.filter(motivo='venta', notas=f'Orden #{orden_id}').count(), 2)
        self.assertTrue(EventoAuditoria.objects.filter(accion='cobro_orden', objeto_id=str(orden_id)).exists())

    def test_cobro_con_tarjeta_no_guarda_pago_ni_cambio(self):
        self.como('caja')
        orden_id = self.crear_orden(items=[{'producto_id': self.pastor.pk}]).data['id']
        res = self.api.post(f'/api/ventas/ordenes/{orden_id}/cerrar/', {'metodo_pago': 'tarjeta', 'pagado_con': '500'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data['pagado_con'])
        self.assertIsNone(res.data['cambio'])

    def test_no_se_cobra_dos_veces_ni_una_orden_vacia(self):
        self.como('caja')
        vacia = self.crear_orden().data['id']
        self.assertEqual(self.api.post(f'/api/ventas/ordenes/{vacia}/cerrar/', {'metodo_pago': 'efectivo'}, format='json').status_code, 400)

        orden_id = self.crear_orden(items=[{'producto_id': self.pastor.pk}]).data['id']
        url = f'/api/ventas/ordenes/{orden_id}/cerrar/'
        self.assertEqual(self.api.post(url, {'metodo_pago': 'efectivo'}, format='json').status_code, 200)
        self.assertEqual(self.api.post(url, {'metodo_pago': 'efectivo'}, format='json').status_code, 400)
        self.assertEqual(Ticket.objects.filter(orden_id=orden_id).count(), 1)
        self.tortilla.refresh_from_db()
        self.assertEqual(self.tortilla.stock_actual, Decimal('98.00'))  # se descontó una sola vez

    def test_pago_insuficiente_o_metodo_invalido(self):
        self.como('caja')
        orden_id = self.crear_orden(items=[{'producto_id': self.pastor.pk, 'cantidad': 2}]).data['id']
        url = f'/api/ventas/ordenes/{orden_id}/cerrar/'
        self.assertEqual(self.api.post(url, {'metodo_pago': 'efectivo', 'pagado_con': '10'}, format='json').status_code, 400)
        self.assertEqual(self.api.post(url, {'metodo_pago': 'bitcoin'}, format='json').status_code, 400)
        self.assertEqual(Orden.objects.get(pk=orden_id).estado, 'abierta')
        self.tortilla.refresh_from_db()
        self.assertEqual(self.tortilla.stock_actual, Decimal('100.00'))

    def test_no_se_modifica_una_orden_pagada(self):
        self.como('caja')
        orden_id = self.crear_orden(items=[{'producto_id': self.pastor.pk}]).data['id']
        self.api.post(f'/api/ventas/ordenes/{orden_id}/cerrar/', {'metodo_pago': 'tarjeta'}, format='json')
        res = self.api.post(f'/api/ventas/ordenes/{orden_id}/items/', {'producto_id': self.pastor.pk}, format='json')
        self.assertEqual(res.status_code, 400)

    # ── Cocina ───────────────────────────────────────────────────

    def test_cocina_ve_pedidos_sin_precios_y_en_orden_de_llegada(self):
        self.como('caja')
        primera = self.crear_orden(cliente='Primero', items=[{'producto_id': self.pastor.pk, 'notas': 'con todo'}]).data['id']
        segunda = self.crear_orden(cliente='Segundo', items=[{'producto_id': self.bistec.pk}]).data['id']
        self.como('cocina')
        res = self.api.get('/api/ventas/ordenes/pendientes-cocina/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual([o['id'] for o in res.data], [primera, segunda])
        self.assertEqual(res.data[0]['referencia'], 'Primero')
        self.assertEqual(res.data[0]['items'][0], {'producto': 'Taco al pastor', 'cantidad': 1, 'notas': 'con todo'})
        payload = str(res.data).lower()
        for prohibido in ('total', 'precio', 'subtotal', 'costo'):
            self.assertNotIn(prohibido, payload)
