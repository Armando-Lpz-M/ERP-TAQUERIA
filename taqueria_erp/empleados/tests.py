from datetime import date
from datetime import datetime, timezone as datetime_timezone
from io import StringIO

from django.contrib.auth.models import Group, User
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from cocina.models import Categoria, Ingrediente, Producto
from empleados.models import Empleado, EventoAuditoria
from inventario.models import EntradaInventario, Proveedor
from reportes.models import ReporteVentaDiaria
from ventas.models import ItemOrden, Mesa, Orden, Ticket


@override_settings(SECURE_SSL_REDIRECT=False)
class RoleAPIAccessTests(TestCase):
	@classmethod
	def setUpTestData(cls):
		cls.groups = {name: Group.objects.create(name=name) for name in ('dueño', 'cajero', 'mesero', 'cocina')}
		cls.users = {}
		roles = {'dueño': 'admin', 'cajero': 'cajero', 'mesero': 'mesero', 'cocina': 'taquero', 'mesero_2': 'mesero'}
		for username, role in roles.items():
			user = User.objects.create_user(username=username, password='test-only-password')
			if username == 'dueño':
				user.is_staff = True
				user.save(update_fields=['is_staff'])
			group_name = 'dueño' if role == 'admin' else 'cocina' if role == 'taquero' else role
			user.groups.add(cls.groups[group_name])
			employee = Empleado.objects.create(
				usuario=user,
				nombre=username,
				apellido='Test',
				rol=role,
			)
			cls.users[username] = (user, employee)

		category = Categoria.objects.create(nombre='Test category')
		cls.product = Producto.objects.create(nombre='Test taco', categoria=category, precio='12.50')
		cls.mesa = Mesa.objects.create(numero=1)
		cls.owner_order = Orden.objects.create(mesa=cls.mesa, empleado=cls.users['dueño'][1], notas='owner order')
		cls.waiter_order = Orden.objects.create(mesa=cls.mesa, empleado=cls.users['mesero'][1], notas='waiter order')
		cls.other_waiter_order = Orden.objects.create(mesa=cls.mesa, empleado=cls.users['mesero_2'][1], notas='other waiter order')
		cls.kitchen_order = Orden.objects.create(mesa=cls.mesa, empleado=cls.users['mesero'][1], estado='abierta', notas='kitchen order')
		ItemOrden.objects.create(orden=cls.kitchen_order, producto=cls.product, cantidad=2, precio_unitario='12.50')
		cls.ticket = Ticket.objects.create(
			orden=cls.owner_order,
			total='12.50',
			fecha=datetime(2026, 10, 25, 12, 0, tzinfo=datetime_timezone.utc),
		)
		today = date(2026, 10, 25)
		ReporteVentaDiaria.objects.create(fecha=today, total_ventas='12.50')
		ReporteVentaDiaria.objects.create(fecha=date(2020, 1, 1), total_ventas='99.00')
		cls.ingredient = Ingrediente.objects.create(nombre='Test ingredient', unidad='kg', stock_actual=3)
		cls.supplier = Proveedor.objects.create(nombre='Test supplier')

	def setUp(self):
		self.api = APIClient()

	def authenticate_as(self, username):
		self.api.force_authenticate(user=self.users[username][0])

	def test_owner_can_manage_products_and_inventory_but_cashier_cannot(self):
		self.authenticate_as('dueño')
		self.assertEqual(self.api.get('/api/cocina/productos/').status_code, 200)
		self.assertEqual(self.api.get('/api/inventario/entradas/').status_code, 200)
		self.authenticate_as('cajero')
		self.assertEqual(self.api.get('/api/inventario/entradas/').status_code, 403)
		menu = self.api.get('/api/cocina/productos/menu/')
		self.assertEqual(menu.status_code, 200)
		self.assertEqual(str(menu.data[0]['productos'][0]['precio']), '12.50')
		self.assertEqual(self.api.post('/api/cocina/productos/', {}).status_code, 403)
		self.assertEqual(self.api.post('/api/inventario/salidas/', {}).status_code, 403)

	def test_cashier_can_close_order_and_sees_only_configured_today(self):
		self.authenticate_as('cajero')
		close_order = Orden.objects.create(mesa=self.mesa, empleado=self.users['dueño'][1], notas='cashier close')
		response = self.api.post(
			f'/api/ventas/ordenes/{close_order.pk}/cerrar/',
			{'metodo_pago': 'efectivo'},
			format='json',
		)
		self.assertEqual(response.status_code, 200)
		reports = self.api.get('/api/reportes/ventas-diarias/?fecha__gte=2020-01-01')
		self.assertEqual(reports.status_code, 200)
		self.assertEqual([row['fecha'] for row in reports.data], ['2026-10-25'])
		self.assertEqual(self.api.get('/api/ventas/tickets/').status_code, 200)
		self.assertEqual(self.api.get('/api/reportes/ventas-diarias/pdf/').status_code, 403)
		self.authenticate_as('dueño')
		pdf_response = self.api.get('/api/reportes/ventas-diarias/pdf/')
		self.assertEqual(pdf_response.status_code, 200)
		self.assertEqual(pdf_response['Content-Type'], 'application/pdf')

	def test_waiter_can_create_and_only_access_own_order(self):
		self.authenticate_as('mesero')
		created = self.api.post('/api/ventas/ordenes/', {'notas': 'new own order'}, format='json')
		self.assertEqual(created.status_code, 201)
		self.assertEqual(created.data['empleado'], self.users['mesero'][1].pk)
		self.assertEqual(self.api.get(f'/api/ventas/ordenes/{self.other_waiter_order.pk}/').status_code, 403)
		self.assertEqual(
			self.api.patch(f'/api/ventas/ordenes/{self.other_waiter_order.pk}/', {'notas': 'no'}, format='json').status_code,
			403,
		)
		self.assertEqual(self.api.patch(f'/api/ventas/ordenes/{self.waiter_order.pk}/', {'notas': 'updated'}, format='json').status_code, 200)
		self.assertEqual(self.api.post(f'/api/ventas/ordenes/{self.waiter_order.pk}/cerrar/', {'metodo_pago': 'efectivo'}).status_code, 403)
		self.assertEqual(self.api.patch(f'/api/cocina/productos/{self.product.pk}/', {'precio': '1.00'}, format='json').status_code, 403)
		self.assertEqual(self.api.post(f'/api/ventas/ordenes/{self.waiter_order.pk}/cancelar/').status_code, 200)

	def test_waiter_cannot_cancel_after_preparation_begins(self):
		self.authenticate_as('mesero')
		self.kitchen_order.estado = 'en_proceso'
		self.kitchen_order.save(update_fields=['estado'])
		self.assertEqual(self.api.post(f'/api/ventas/ordenes/{self.kitchen_order.pk}/cancelar/').status_code, 403)
		self.authenticate_as('cajero')
		self.assertEqual(self.api.post(f'/api/ventas/ordenes/{self.kitchen_order.pk}/cancelar/').status_code, 200)

	def test_kitchen_receives_no_prices_totals_or_costs_and_only_advances(self):
		self.authenticate_as('cocina')
		self.assertEqual(self.api.get('/api/cocina/productos/menu/').status_code, 403)
		self.assertEqual(self.api.get('/api/inventario/entradas/').status_code, 403)
		response = self.api.get('/api/ventas/ordenes/pendientes-cocina/')
		self.assertEqual(response.status_code, 200)
		payload = str(response.data).lower()
		for forbidden in ('total', 'precio', 'subtotal', 'costo'):
			self.assertNotIn(forbidden, payload)
		order_id = self.kitchen_order.pk
		self.assertEqual(self.api.post(f'/api/ventas/ordenes/{order_id}/cambiar-estado/', {'estado': 'en_proceso'}).status_code, 200)
		self.assertEqual(self.api.post(f'/api/ventas/ordenes/{order_id}/cambiar-estado/', {'estado': 'abierta'}).status_code, 403)
		self.assertNotIn('total', str(self.api.get(f'/api/ventas/ordenes/{order_id}/').data).lower())

	def test_denied_role_access_is_audited(self):
		self.authenticate_as('cajero')
		self.assertEqual(self.api.get('/api/empleados/empleados/').status_code, 403)
		self.assertTrue(EventoAuditoria.objects.filter(accion='acceso_denegado', usuario=self.users['cajero'][0]).exists())
		self.authenticate_as('mesero')
		self.assertEqual(self.api.get('/api/reportes/ventas-diarias/').status_code, 403)

	def test_anonymous_sensitive_api_returns_401(self):
		self.assertEqual(self.api.get('/api/inventario/entradas/').status_code, 401)

	def test_anonymous_erp_page_redirects_to_login(self):
		response = self.client.get('/erp/')
		self.assertIn(response.status_code, (301, 302))
		self.assertIn('/login/', response.headers['Location'])

	def test_valid_jwt_can_establish_protected_erp_session(self):
		client = APIClient(enforce_csrf_checks=True)
		client.get('/login/')
		token = str(AccessToken.for_user(self.users['mesero'][0]))
		csrf = client.cookies['csrftoken'].value
		response = client.post(
			'/api/session-login/',
			{},
			format='json',
			HTTP_AUTHORIZATION=f'Bearer {token}',
			HTTP_X_CSRFTOKEN=csrf,
		)
		self.assertEqual(response.status_code, 200)
		self.assertEqual(client.get('/erp/').status_code, 200)

	@override_settings(ADMIN_URL='gestion-privada/')
	def test_owner_only_admin_path_and_denial_status(self):
		self.client.force_login(self.users['cajero'][0])
		self.assertEqual(self.client.get('/gestion-privada/').status_code, 403)

		self.client.force_login(self.users['dueño'][0])
		self.assertEqual(self.client.get('/gestion-privada/').status_code, 200)

		self.client.logout()
		self.assertIn(self.client.get('/gestion-privada/').status_code, (301, 302))

	@override_settings(TIME_ZONE='America/Mexico_City')
	def test_cashier_tickets_are_limited_to_configured_local_day(self):
		self.authenticate_as('cajero')
		response = self.api.get('/api/ventas/tickets/')
		self.assertEqual(response.status_code, 200)
		self.assertTrue(all(str(ticket['fecha']).startswith('2026-10-25') for ticket in response.data))

	def test_price_change_and_deletion_are_audited(self):
		self.authenticate_as('dueño')
		response = self.api.patch(
			f'/api/cocina/productos/{self.product.pk}/',
			{'precio': '15.00'},
			format='json',
		)
		self.assertEqual(response.status_code, 200)
		event = EventoAuditoria.objects.get(accion='cambio_precio', objeto_id=str(self.product.pk))
		self.assertEqual(str(event.valor_anterior), '12.50')
		self.assertEqual(str(event.valor_nuevo), '15.00')

		response = self.api.delete(f'/api/ventas/ordenes/{self.owner_order.pk}/')
		self.assertEqual(response.status_code, 204)
		self.assertTrue(EventoAuditoria.objects.filter(accion='eliminacion', objeto_tipo='Orden').exists())

	def test_employee_role_change_is_audited(self):
		self.authenticate_as('dueño')
		response = self.api.patch(
			f"/api/empleados/empleados/{self.users['mesero'][1].pk}/",
			{'rol': 'cajero'},
			format='json',
		)
		self.assertEqual(response.status_code, 200)
		self.assertTrue(EventoAuditoria.objects.filter(accion='cambio_rol', objeto_tipo='Empleado').exists())
		self.assertTrue(self.users['mesero'][0].groups.filter(name='cajero').exists())

	def test_owner_role_demotion_removes_owner_admin_membership(self):
		self.authenticate_as('dueño')
		owner = self.users['dueño'][0]
		response = self.api.patch(
			f"/api/empleados/empleados/{self.users['dueño'][1].pk}/",
			{'rol': 'cajero'},
			format='json',
		)
		self.assertEqual(response.status_code, 200)
		owner.refresh_from_db()
		self.assertFalse(owner.groups.filter(name='dueño').exists())
		self.assertFalse(owner.is_staff)
		self.assertEqual(self.api.get('/api/me/').data['rol'], 'cajero')
		self.assertIn(self.client.get('/gestion-privada/').status_code, (301, 302))

	def test_crear_roles_is_repeatable_and_creates_no_real_passwords(self):
		call_command('crear_roles', crear_usuarios_prueba=True, stdout=StringIO())
		initial_user_count = User.objects.count()
		call_command('crear_roles', crear_usuarios_prueba=True, stdout=StringIO())
		self.assertEqual(User.objects.count(), initial_user_count)
		self.assertFalse(User.objects.get(username='test_dueño').has_usable_password())
		self.assertEqual(User.objects.get(username='test_cocina').empleado.rol, 'taquero')
		self.assertTrue(User.objects.get(username='test_dueño').groups.filter(name='dueño').exists())
