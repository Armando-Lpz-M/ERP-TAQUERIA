"""
Pruebas de seguridad transversales:

- Matriz de roles: cada endpoint de la API contra los 4 roles y un anónimo.
- Sesiones: cierre de sesión, rotación del refresh token y cambio de contraseña.
- Integridad: tickets inmutables, borrado lógico de mesas y protección del superusuario.
"""
from decimal import Decimal

from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from cocina.models import Categoria, Ingrediente, Producto
from empleados.models import Empleado, EventoAuditoria
from inventario.models import Proveedor
from ventas import services
from ventas.models import ItemOrden, Mesa, Orden, Ticket

PASSWORD = 'Tacos-al-Pastor-2026'
ROLES = ('admin', 'cajero', 'mesero', 'cocina')
REFRESH_COOKIE = 'erp_refresh'


def crear_usuarios():
    """Un usuario con perfil de empleado por cada rol del ERP."""
    usuarios = {}
    for rol, rol_empleado in {'admin': 'admin', 'cajero': 'cajero', 'mesero': 'mesero', 'cocina': 'taquero'}.items():
        user = User.objects.create_user(username=rol, password=PASSWORD)
        usuarios[rol] = Empleado.objects.create(usuario=user, nombre=rol.title(), apellido='Prueba', rol=rol_empleado)
    return usuarios


@override_settings(SECURE_SSL_REDIRECT=False, AXES_ENABLED=False)
class MatrizDeRolesTests(TestCase):
    """Cada endpoint deja pasar solo a sus roles; a los demás les responde 403 (nunca 500)."""

    @classmethod
    def setUpTestData(cls):
        cls.usuarios = crear_usuarios()
        categoria = Categoria.objects.create(nombre='Tacos')
        cls.producto = Producto.objects.create(nombre='Pastor', categoria=categoria, precio='18.00')
        cls.ingrediente = Ingrediente.objects.create(nombre='Tortilla', unidad='pza', stock_actual='100')
        cls.proveedor = Proveedor.objects.create(nombre='Tortillería')
        cls.mesa = Mesa.objects.create(numero=1)

        # Orden abierta del mesero, con un producto, para probar las acciones de órdenes
        cls.orden = Orden.objects.create(cliente='Ana', empleado=cls.usuarios['mesero'])
        cls.item = ItemOrden.objects.create(orden=cls.orden, producto=cls.producto, cantidad=2)

        # Orden ya cobrada, para probar los tickets
        pagada = Orden.objects.create(cliente='Beto', empleado=cls.usuarios['cajero'])
        ItemOrden.objects.create(orden=pagada, producto=cls.producto, cantidad=1)
        cls.ticket = services.cobrar_orden(pagada, cls.usuarios['admin'].usuario, 'efectivo', Decimal('20'))

    def endpoints(self):
        """(método, ruta, cuerpo, roles permitidos). Debe cubrir toda la API."""
        o, item, t = self.orden.pk, self.item.pk, self.ticket.pk
        p, ing, prov, mesa = self.producto.pk, self.ingrediente.pk, self.proveedor.pk, self.mesa.pk
        emp = self.usuarios['mesero'].pk
        todos = set(ROLES)
        admin = {'admin'}
        caja = {'admin', 'cajero'}
        piso = {'admin', 'cajero', 'mesero'}
        return [
            ('get', '/api/me/', None, todos),
            # Ventas
            ('get', '/api/ventas/mesas/', None, piso),
            ('post', '/api/ventas/mesas/', {'numero': 99}, admin),
            ('delete', f'/api/ventas/mesas/{mesa}/', None, admin),
            ('get', '/api/ventas/ordenes/', None, todos),
            ('get', '/api/ventas/ordenes/activas/', None, todos),
            ('get', '/api/ventas/ordenes/abiertas/', None, todos),
            ('get', '/api/ventas/ordenes/pendientes-cocina/', None, {'admin', 'cocina'}),
            ('get', f'/api/ventas/ordenes/{o}/', None, todos),
            ('post', '/api/ventas/ordenes/', {'cliente': 'Nuevo'}, piso),
            ('patch', f'/api/ventas/ordenes/{o}/', {'notas': 'para llevar'}, {'admin', 'mesero'}),
            ('post', f'/api/ventas/ordenes/{o}/items/', {'producto_id': p}, piso),
            ('patch', f'/api/ventas/ordenes/{o}/items/{item}/', {'cantidad': 3}, piso),
            ('delete', f'/api/ventas/ordenes/{o}/items/{item}/', None, piso),
            ('post', f'/api/ventas/ordenes/{o}/cerrar/', {'metodo_pago': 'tarjeta'}, caja),
            ('post', f'/api/ventas/ordenes/{o}/cancelar/', None, piso),
            ('post', f'/api/ventas/ordenes/{o}/cambiar-estado/', {'estado': 'en_proceso'}, {'admin', 'cocina'}),
            ('delete', f'/api/ventas/ordenes/{o}/', None, admin),
            ('get', '/api/ventas/tickets/', None, caja),
            ('get', f'/api/ventas/tickets/{t}/', None, caja),
            ('delete', f'/api/ventas/tickets/{t}/', None, admin),
            # Menú e ingredientes
            ('get', '/api/cocina/categorias/', None, piso),
            ('post', '/api/cocina/categorias/', {'nombre': 'Bebidas'}, admin),
            ('get', '/api/cocina/productos/', None, piso),
            ('get', '/api/cocina/productos/menu/', None, piso),
            ('get', f'/api/cocina/productos/{p}/', None, piso),
            ('post', '/api/cocina/productos/', {'nombre': 'Suadero', 'categoria_id': self.producto.categoria_id, 'precio': '20.00'}, admin),
            ('patch', f'/api/cocina/productos/{p}/', {'precio': '19.00'}, admin),
            ('put', f'/api/cocina/productos/{p}/receta/', {'ingredientes': [{'ingrediente_id': ing, 'cantidad': '2'}]}, admin),
            ('get', '/api/cocina/ingredientes/', None, admin),
            ('get', '/api/cocina/ingredientes/stock-bajo/', None, admin),
            ('post', '/api/cocina/ingredientes/', {'nombre': 'Cebolla', 'unidad': 'kg'}, admin),
            # Inventario
            ('get', '/api/inventario/proveedores/', None, admin),
            ('post', '/api/inventario/proveedores/', {'nombre': 'Carnes'}, admin),
            ('delete', f'/api/inventario/proveedores/{prov}/', None, admin),
            ('get', '/api/inventario/entradas/', None, admin),
            ('post', '/api/inventario/entradas/', {'ingrediente_id': ing, 'cantidad': '10'}, admin),
            ('get', '/api/inventario/salidas/', None, admin),
            ('post', '/api/inventario/salidas/', {'ingrediente_id': ing, 'cantidad': '1', 'motivo': 'merma'}, admin),
            # Empleados y turnos
            ('get', '/api/empleados/empleados/', None, admin),
            ('post', '/api/empleados/empleados/', {'nombre': 'Eva', 'apellido': 'Ruiz', 'rol': 'mesero'}, admin),
            ('patch', f'/api/empleados/empleados/{emp}/', {'telefono': '555'}, admin),
            ('delete', f'/api/empleados/empleados/{emp}/', None, admin),
            ('post', f'/api/empleados/empleados/{emp}/acceso/', {'password': PASSWORD + 'x'}, admin),
            ('post', f'/api/empleados/empleados/{emp}/entrada/', None, admin),
            ('post', f'/api/empleados/empleados/{emp}/salida/', None, admin),
            ('get', '/api/empleados/turnos/', None, admin),
            ('get', '/api/empleados/turnos/activos/', None, admin),
            # Reportes
            ('get', '/api/reportes/resumen/', None, caja),
            ('get', '/api/reportes/resumen/excel/', None, admin),
            ('get', '/api/reportes/resumen/pdf/', None, admin),
            ('get', '/api/reportes/ventas-diarias/', None, caja),
            ('post', '/api/reportes/ventas-diarias/generar/', None, caja),
            ('get', '/api/reportes/ventas-diarias/pdf/', None, admin),
        ]

    def llamar(self, api, metodo, ruta, cuerpo):
        # Cada llamada se deshace al terminar para que no afecte a las siguientes
        sid = transaction.savepoint()
        try:
            return getattr(api, metodo)(ruta, cuerpo, format='json')
        finally:
            transaction.savepoint_rollback(sid)

    def test_cada_rol_solo_entra_donde_le_toca(self):
        for metodo, ruta, cuerpo, permitidos in self.endpoints():
            for rol in ROLES:
                with self.subTest(rol=rol, endpoint=f'{metodo.upper()} {ruta}'):
                    api = APIClient()
                    api.force_authenticate(self.usuarios[rol].usuario)
                    res = self.llamar(api, metodo, ruta, cuerpo)
                    self.assertLess(res.status_code, 500, getattr(res, 'data', None))
                    if rol in permitidos:
                        self.assertNotIn(res.status_code, (401, 403), getattr(res, 'data', None))
                    else:
                        self.assertEqual(res.status_code, 403, getattr(res, 'data', None))

    def test_anonimo_recibe_401_en_toda_la_api(self):
        api = APIClient()
        for metodo, ruta, cuerpo, _ in self.endpoints():
            with self.subTest(endpoint=f'{metodo.upper()} {ruta}'):
                self.assertEqual(self.llamar(api, metodo, ruta, cuerpo).status_code, 401)

    def test_empleado_dado_de_baja_pierde_acceso_al_instante(self):
        """Aunque su access token siga vigente, un empleado inactivo ya no puede operar."""
        api = APIClient()
        cajero = self.usuarios['cajero']
        api.force_authenticate(cajero.usuario)
        self.assertEqual(api.get('/api/ventas/tickets/').status_code, 200)
        cajero.activo = False
        cajero.save(update_fields=['activo'])
        self.assertEqual(api.get('/api/ventas/tickets/').status_code, 403)


@override_settings(SECURE_SSL_REDIRECT=False, AXES_ENABLED=False)
class SesionesTests(TestCase):
    """Cierre de sesión y revocación de tokens."""

    @classmethod
    def setUpTestData(cls):
        cls.usuarios = crear_usuarios()

    def login(self, rol):
        api = APIClient()
        res = api.post('/api/auth/login/', {'username': rol, 'password': PASSWORD}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        return api, res.cookies[REFRESH_COOKIE].value

    def refresh_con(self, token):
        api = APIClient()
        api.cookies[REFRESH_COOKIE] = token
        return api.post('/api/auth/refresh/')

    def test_access_token_de_corta_duracion(self):
        """Con renovación automática en el frontend, el access token no necesita durar horas."""
        self.assertLessEqual(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(), 3600)

    def test_refresh_rota_el_token_y_el_anterior_deja_de_servir(self):
        _, token = self.login('mesero')
        res = self.refresh_con(token)
        self.assertEqual(res.status_code, 200, res.data)
        nuevo = res.cookies[REFRESH_COOKIE].value
        self.assertNotEqual(nuevo, token)
        self.assertEqual(self.refresh_con(token).status_code, 401)
        self.assertEqual(self.refresh_con(nuevo).status_code, 200)

    def test_logout_invalida_el_refresh_token(self):
        """Si alguien copió la cookie, cerrar sesión la deja inservible."""
        api, token = self.login('cajero')
        self.assertEqual(api.post('/api/auth/logout/').status_code, 204)
        self.assertEqual(self.refresh_con(token).status_code, 401)

    def test_cambiar_password_cierra_las_sesiones_anteriores(self):
        _, token_viejo = self.login('mesero')
        admin = APIClient()
        admin.force_authenticate(self.usuarios['admin'].usuario)
        res = admin.post(
            f'/api/empleados/empleados/{self.usuarios["mesero"].pk}/acceso/', {'password': 'Otra-Clave-Segura-77'}, format='json'
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(self.refresh_con(token_viejo).status_code, 401)

    def test_refresh_anonimo_no_llena_la_auditoria(self):
        """Cada visita a la pantalla de login intenta restaurar sesión; eso no es un acceso denegado."""
        EventoAuditoria.objects.all().delete()
        self.assertEqual(APIClient().post('/api/auth/refresh/').status_code, 401)
        self.assertFalse(EventoAuditoria.objects.filter(accion='acceso_denegado').exists())


@override_settings(SECURE_SSL_REDIRECT=False, AXES_ENABLED=False)
class IntegridadTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.usuarios = crear_usuarios()
        categoria = Categoria.objects.create(nombre='Tacos')
        cls.producto = Producto.objects.create(nombre='Pastor', categoria=categoria, precio='18.00')
        cls.mesa = Mesa.objects.create(numero=7)

    def setUp(self):
        self.api = APIClient()
        self.api.force_authenticate(self.usuarios['admin'].usuario)

    def cobrar(self):
        orden = Orden.objects.create(cliente='Caro', empleado=self.usuarios['cajero'])
        ItemOrden.objects.create(orden=orden, producto=self.producto, cantidad=1)
        return services.cobrar_orden(orden, self.usuarios['admin'].usuario, 'efectivo', Decimal('20'))

    def test_los_tickets_no_se_crean_ni_se_editan_a_mano(self):
        """Un ticket solo nace al cobrar; su total no se toca (anularlo sí, y queda auditado)."""
        ticket = self.cobrar()
        self.assertEqual(self.api.post('/api/ventas/tickets/', {'total': '1.00'}, format='json').status_code, 405)
        self.assertEqual(self.api.patch(f'/api/ventas/tickets/{ticket.pk}/', {'total': '1.00'}, format='json').status_code, 405)
        self.assertEqual(self.api.put(f'/api/ventas/tickets/{ticket.pk}/', {'total': '1.00'}, format='json').status_code, 405)
        self.assertEqual(Ticket.objects.get(pk=ticket.pk).total, Decimal('18.00'))

        self.assertEqual(self.api.delete(f'/api/ventas/tickets/{ticket.pk}/').status_code, 204)
        self.assertEqual(Orden.objects.get(pk=ticket.orden_id).estado, 'cancelada')
        self.assertTrue(EventoAuditoria.objects.filter(accion='cancelacion_ticket', objeto_id=str(ticket.pk)).exists())

    def test_borrar_mesa_es_logico(self):
        """Las órdenes viejas conservan su mesa; solo deja de aparecer en la lista."""
        Orden.objects.create(mesa=self.mesa, empleado=self.usuarios['mesero'])
        self.assertEqual(self.api.delete(f'/api/ventas/mesas/{self.mesa.pk}/').status_code, 204)
        self.mesa.refresh_from_db()
        self.assertFalse(self.mesa.activa)
        self.assertEqual(Orden.objects.filter(mesa=self.mesa).count(), 1)
        self.assertEqual([m['numero'] for m in self.api.get('/api/ventas/mesas/').data], [])

    def test_un_admin_no_puede_tomar_la_cuenta_del_superusuario(self):
        """Cambiarle la contraseña, el rol o darlo de baja sería escalar privilegios al panel de Django."""
        root = User.objects.create_user('root', password=PASSWORD, is_superuser=True, is_staff=True)
        root_emp = Empleado.objects.create(usuario=root, nombre='Root', apellido='Sys', rol='admin')
        url = f'/api/empleados/empleados/{root_emp.pk}/'

        self.assertEqual(self.api.post(url + 'acceso/', {'password': 'Clave-Robada-123'}, format='json').status_code, 403)
        self.assertTrue(User.objects.get(pk=root.pk).check_password(PASSWORD))
        self.assertEqual(self.api.patch(url, {'rol': 'mesero'}, format='json').status_code, 403)
        self.assertEqual(self.api.patch(url, {'activo': False}, format='json').status_code, 403)
        self.assertEqual(self.api.delete(url).status_code, 403)
        root_emp.refresh_from_db()
        self.assertTrue(root_emp.activo)
        self.assertEqual(root_emp.rol, 'admin')

        # Un superusuario sí puede administrar a otro superusuario
        self.api.force_authenticate(root)
        otro = Empleado.objects.create(
            usuario=User.objects.create_user('root2', password=PASSWORD, is_superuser=True), nombre='R2', apellido='S', rol='admin'
        )
        self.assertEqual(self.api.patch(f'/api/empleados/empleados/{otro.pk}/', {'telefono': '1'}, format='json').status_code, 200)

    def test_mesero_puede_corregir_el_nombre_del_cliente_de_su_orden(self):
        mesero = self.usuarios['mesero']
        orden = Orden.objects.create(cliente='Jaun', empleado=mesero)
        self.api.force_authenticate(mesero.usuario)
        res = self.api.patch(f'/api/ventas/ordenes/{orden.pk}/', {'cliente': 'Juan'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['cliente'], 'Juan')
        # Pero no puede reasignar la orden a otro empleado
        res = self.api.patch(f'/api/ventas/ordenes/{orden.pk}/', {'empleado': self.usuarios['cajero'].pk}, format='json')
        self.assertEqual(res.status_code, 403)
