from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from cocina.models import Categoria, Ingrediente, Producto, RecetaIngrediente
from empleados.models import Empleado, EventoAuditoria
from ventas.models import ItemOrden, Orden

from .models import EntradaInventario, Proveedor, SalidaInventario


@override_settings(SECURE_SSL_REDIRECT=False, AXES_ENABLED=False)
class MenuEInventarioTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user('jefe', password='x', is_superuser=True)
        cls.cajero = User.objects.create_user('caja', password='x')
        Empleado.objects.create(usuario=cls.cajero, nombre='Ana', apellido='R', rol='cajero')
        cls.tacos = Categoria.objects.create(nombre='Tacos')
        cls.pastor = Producto.objects.create(nombre='Pastor', categoria=cls.tacos, precio='18.00')
        cls.tortilla = Ingrediente.objects.create(nombre='Tortilla', unidad='pza', stock_actual='100', stock_minimo='20')
        cls.carne = Ingrediente.objects.create(nombre='Carne', unidad='kg', stock_actual='1.00', stock_minimo='2.00')
        cls.proveedor = Proveedor.objects.create(nombre='Tortillería Lupita')

    def setUp(self):
        self.api = APIClient()
        self.api.force_authenticate(self.admin)

    # ── Productos ────────────────────────────────────────────────

    def test_admin_ve_y_reactiva_productos_no_disponibles(self):
        res = self.api.patch(f'/api/cocina/productos/{self.pastor.pk}/', {'disponible': False}, format='json')
        self.assertEqual(res.status_code, 200)
        ids = [p['id'] for p in self.api.get('/api/cocina/productos/').data]
        self.assertIn(self.pastor.pk, ids)
        res = self.api.patch(f'/api/cocina/productos/{self.pastor.pk}/', {'disponible': True}, format='json')
        self.assertEqual(res.status_code, 200)

        # El cajero no ve los no disponibles
        Producto.objects.filter(pk=self.pastor.pk).update(disponible=False)
        self.api.force_authenticate(self.cajero)
        self.assertNotIn(self.pastor.pk, [p['id'] for p in self.api.get('/api/cocina/productos/').data])

    def test_crear_producto_valida_precio_y_categoria(self):
        url = '/api/cocina/productos/'
        self.assertEqual(self.api.post(url, {'nombre': 'Gratis', 'categoria_id': self.tacos.pk, 'precio': '0'}, format='json').status_code, 400)
        self.assertEqual(self.api.post(url, {'nombre': 'Sin cat', 'precio': '10'}, format='json').status_code, 400)
        res = self.api.post(url, {'nombre': 'Suadero', 'categoria_id': self.tacos.pk, 'precio': '19.50'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['categoria']['nombre'], 'Tacos')

    def test_no_se_borra_un_producto_con_ventas(self):
        orden = Orden.objects.create(cliente='X')
        ItemOrden.objects.create(orden=orden, producto=self.pastor, cantidad=1, precio_unitario='18.00')
        res = self.api.delete(f'/api/cocina/productos/{self.pastor.pk}/')
        self.assertEqual(res.status_code, 400)
        self.assertTrue(ItemOrden.objects.filter(orden=orden).exists())

    def test_editar_receta_reemplaza_ingredientes(self):
        url = f'/api/cocina/productos/{self.pastor.pk}/receta/'
        res = self.api.put(url, {'ingredientes': [
            {'ingrediente_id': self.tortilla.pk, 'cantidad': '2'},
            {'ingrediente_id': self.carne.pk, 'cantidad': '0.085'},
        ]}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(len(res.data['receta']), 2)
        res = self.api.put(url, {'ingredientes': [{'ingrediente_id': self.tortilla.pk, 'cantidad': '3'}]}, format='json')
        self.assertEqual(RecetaIngrediente.objects.get(producto=self.pastor).cantidad, Decimal('3.000'))
        self.assertTrue(EventoAuditoria.objects.filter(accion='cambio_receta').exists())

    def test_receta_invalida(self):
        url = f'/api/cocina/productos/{self.pastor.pk}/receta/'
        duplicado = [{'ingrediente_id': self.tortilla.pk, 'cantidad': '1'}, {'ingrediente_id': self.tortilla.pk, 'cantidad': '2'}]
        self.assertEqual(self.api.put(url, {'ingredientes': duplicado}, format='json').status_code, 400)
        self.assertEqual(self.api.put(url, {'ingredientes': [{'ingrediente_id': self.tortilla.pk, 'cantidad': '0'}]}, format='json').status_code, 400)
        self.api.force_authenticate(self.cajero)
        self.assertEqual(self.api.put(url, {'ingredientes': []}, format='json').status_code, 403)

    # ── Categorías e ingredientes ────────────────────────────────

    def test_borrar_categoria_e_ingrediente_es_logico(self):
        self.assertEqual(self.api.delete(f'/api/cocina/categorias/{self.tacos.pk}/').status_code, 204)
        self.tacos.refresh_from_db()
        self.assertFalse(self.tacos.activo)
        self.assertTrue(Producto.objects.filter(pk=self.pastor.pk, categoria=self.tacos).exists())

        EntradaInventario.objects.create(ingrediente=self.tortilla, cantidad='10', costo_unitario='1')
        self.assertEqual(self.api.delete(f'/api/cocina/ingredientes/{self.tortilla.pk}/').status_code, 204)
        self.assertEqual(EntradaInventario.objects.filter(ingrediente=self.tortilla).count(), 1)

    def test_categorias_cuentan_productos(self):
        res = self.api.get('/api/cocina/categorias/')
        self.assertEqual(res.data[0]['total_productos'], 1)

    def test_stock_solo_se_fija_al_crear_el_ingrediente(self):
        res = self.api.post('/api/cocina/ingredientes/', {'nombre': 'Cebolla', 'unidad': 'kg', 'stock_actual': '3', 'stock_minimo': '1'}, format='json')
        self.assertEqual(res.status_code, 201)
        url = f"/api/cocina/ingredientes/{res.data['id']}/"
        self.assertEqual(self.api.patch(url, {'stock_actual': '50'}, format='json').status_code, 400)
        self.assertEqual(self.api.patch(url, {'stock_minimo': '2'}, format='json').status_code, 200)

    def test_stock_bajo(self):
        nombres = [i['nombre'] for i in self.api.get('/api/cocina/ingredientes/stock-bajo/').data]
        self.assertEqual(nombres, ['Carne'])

    # ── Entradas y salidas ───────────────────────────────────────

    def test_entrada_suma_stock_y_calcula_costo(self):
        res = self.api.post('/api/inventario/entradas/', {
            'ingrediente_id': self.tortilla.pk, 'proveedor_id': self.proveedor.pk, 'cantidad': '50', 'costo_unitario': '1.20',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(Decimal(res.data['costo_total']), Decimal('60.00'))
        self.tortilla.refresh_from_db()
        self.assertEqual(self.tortilla.stock_actual, Decimal('150.00'))

    def test_movimientos_no_se_editan_ni_se_borran(self):
        entrada = EntradaInventario.objects.create(ingrediente=self.tortilla, cantidad='10', costo_unitario='1')
        self.assertEqual(self.api.patch(f'/api/inventario/entradas/{entrada.pk}/', {'cantidad': '99'}, format='json').status_code, 405)
        self.assertEqual(self.api.delete(f'/api/inventario/entradas/{entrada.pk}/').status_code, 405)
        self.tortilla.refresh_from_db()
        self.assertEqual(self.tortilla.stock_actual, Decimal('110.00'))

    def test_salida_valida_stock_y_motivo(self):
        url = '/api/inventario/salidas/'
        self.assertEqual(self.api.post(url, {'ingrediente_id': self.carne.pk, 'cantidad': '5', 'motivo': 'merma'}, format='json').status_code, 400)
        self.assertEqual(self.api.post(url, {'ingrediente_id': self.carne.pk, 'cantidad': '-1', 'motivo': 'merma'}, format='json').status_code, 400)
        self.assertEqual(self.api.post(url, {'ingrediente_id': self.carne.pk, 'cantidad': '0.5', 'motivo': 'venta'}, format='json').status_code, 400)
        res = self.api.post(url, {'ingrediente_id': self.carne.pk, 'cantidad': '0.25', 'motivo': 'merma', 'notas': 'se quemó'}, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.carne.refresh_from_db()
        self.assertEqual(self.carne.stock_actual, Decimal('0.75'))

    def test_movimientos_paginados_y_ordenados(self):
        for i in range(3):
            EntradaInventario.objects.create(ingrediente=self.tortilla, cantidad=str(i + 1), costo_unitario='1')
        SalidaInventario.objects.create(ingrediente=self.tortilla, cantidad='1', motivo='venta', notas='Orden #9')
        res = self.api.get('/api/inventario/entradas/?limit=2')
        self.assertEqual(res.data['count'], 3)
        self.assertEqual(len(res.data['results']), 2)
        self.assertEqual(res.data['results'][0]['cantidad'], '3.00')
        res = self.api.get('/api/inventario/salidas/?motivo=venta')
        self.assertEqual(res.data['results'][0]['motivo'], 'venta')

    def test_proveedor_se_desactiva_sin_perder_historial(self):
        entrada = EntradaInventario.objects.create(ingrediente=self.tortilla, proveedor=self.proveedor, cantidad='5', costo_unitario='1')
        self.assertEqual(self.api.delete(f'/api/inventario/proveedores/{self.proveedor.pk}/').status_code, 204)
        entrada.refresh_from_db()
        self.assertEqual(entrada.proveedor_id, self.proveedor.pk)
        self.assertEqual(self.api.get('/api/inventario/proveedores/').data, [])

    def test_solo_admin_maneja_inventario(self):
        self.api.force_authenticate(self.cajero)
        self.assertEqual(self.api.get('/api/inventario/entradas/').status_code, 403)
        self.assertEqual(self.api.get('/api/cocina/ingredientes/').status_code, 403)
