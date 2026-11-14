from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Empleado, EventoAuditoria, Turno

PASSWORD_SEGURO = 'Tacos-al-Pastor-2026'


@override_settings(SECURE_SSL_REDIRECT=False, AXES_ENABLED=False)
class GestionEmpleadosTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.jefe = User.objects.create_user('jefe', password='x', is_superuser=True)
        cls.jefe_emp = Empleado.objects.create(usuario=cls.jefe, nombre='Jefe', apellido='A', rol='admin')
        cls.luis = Empleado.objects.create(nombre='Luis', apellido='Mora', rol='mesero')

    def setUp(self):
        self.api = APIClient()
        self.api.force_authenticate(self.jefe)

    def login(self, username, password):
        return APIClient().post('/api/auth/login/', {'username': username, 'password': password}, format='json')

    # ── Alta y acceso ────────────────────────────────────────────

    def test_alta_con_acceso_permite_iniciar_sesion_con_su_rol(self):
        res = self.api.post('/api/empleados/empleados/', {
            'nombre': 'Ana', 'apellido': 'Ruiz', 'rol': 'cajero', 'username': 'ana', 'password': PASSWORD_SEGURO,
        }, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(res.data['tiene_acceso'])
        self.assertNotIn('password', res.data)
        login = self.login('ana', PASSWORD_SEGURO)
        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.data['user']['rol'], 'cajero')

    def test_alta_sin_acceso(self):
        res = self.api.post('/api/empleados/empleados/', {'nombre': 'Pedro', 'apellido': 'P', 'rol': 'taquero'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertFalse(res.data['tiene_acceso'])

    def test_alta_valida_usuario_y_password(self):
        url = '/api/empleados/empleados/'
        base = {'nombre': 'Ana', 'apellido': 'R', 'rol': 'cajero'}
        self.assertEqual(self.api.post(url, {**base, 'username': 'ana'}, format='json').status_code, 400)
        res = self.api.post(url, {**base, 'username': 'ana', 'password': '123'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('password', res.data)
        res = self.api.post(url, {**base, 'username': 'JEFE', 'password': PASSWORD_SEGURO}, format='json')
        self.assertIn('username', res.data)

    def test_dar_acceso_y_cambiar_password(self):
        url = f'/api/empleados/empleados/{self.luis.pk}/acceso/'
        self.assertEqual(self.api.post(url, {'password': PASSWORD_SEGURO}, format='json').status_code, 400)  # falta usuario
        res = self.api.post(url, {'username': 'luis', 'password': PASSWORD_SEGURO}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(self.login('luis', PASSWORD_SEGURO).data['user']['rol'], 'mesero')

        res = self.api.post(url, {'password': 'Otra-Clave-Segura-99'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.login('luis', 'Otra-Clave-Segura-99').status_code, 200)
        self.assertEqual(self.login('luis', PASSWORD_SEGURO).status_code, 401)
        self.assertTrue(EventoAuditoria.objects.filter(accion='cambio_password').exists())

    def test_editar_no_cambia_credenciales(self):
        res = self.api.patch(f'/api/empleados/empleados/{self.luis.pk}/', {'password': PASSWORD_SEGURO}, format='json')
        self.assertEqual(res.status_code, 400)

    # ── Baja y reactivación ──────────────────────────────────────

    def test_baja_es_logica_bloquea_acceso_y_cierra_turno(self):
        self.api.post(f'/api/empleados/empleados/{self.luis.pk}/acceso/', {'username': 'luis', 'password': PASSWORD_SEGURO}, format='json')
        Turno.objects.create(empleado=self.luis, entrada=timezone.now() - timedelta(hours=2))
        self.assertEqual(self.api.delete(f'/api/empleados/empleados/{self.luis.pk}/').status_code, 204)

        self.luis.refresh_from_db()
        self.assertFalse(self.luis.activo)
        self.assertFalse(self.luis.usuario.is_active)
        self.assertEqual(Turno.objects.filter(empleado=self.luis).count(), 1)
        self.assertFalse(Turno.objects.filter(empleado=self.luis, salida__isnull=True).exists())
        self.assertNotEqual(self.login('luis', PASSWORD_SEGURO).status_code, 200)

        # Sigue en la lista (para reactivarlo) y se puede filtrar
        self.assertIn(self.luis.pk, [e['id'] for e in self.api.get('/api/empleados/empleados/').data])
        self.assertNotIn(self.luis.pk, [e['id'] for e in self.api.get('/api/empleados/empleados/?activo=true').data])

        res = self.api.patch(f'/api/empleados/empleados/{self.luis.pk}/', {'activo': True}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.login('luis', PASSWORD_SEGURO).status_code, 200)

    def test_no_puede_darse_de_baja_a_si_mismo(self):
        self.assertEqual(self.api.delete(f'/api/empleados/empleados/{self.jefe_emp.pk}/').status_code, 400)
        res = self.api.patch(f'/api/empleados/empleados/{self.jefe_emp.pk}/', {'activo': False}, format='json')
        self.assertEqual(res.status_code, 400)

    # ── Turnos ───────────────────────────────────────────────────

    def test_entrada_y_salida_de_turno(self):
        base = f'/api/empleados/empleados/{self.luis.pk}'
        res = self.api.post(f'{base}/entrada/')
        self.assertEqual(res.status_code, 201)
        self.assertIsNotNone(self.api.get(f'{base}/').data['turno_activo'])
        self.assertEqual(self.api.post(f'{base}/entrada/').status_code, 400)  # ya tiene turno abierto
        self.assertEqual(len(self.api.get('/api/empleados/turnos/activos/').data), 1)

        res = self.api.post(f'{base}/salida/')
        self.assertEqual(res.status_code, 200)
        self.assertIsNotNone(res.data['salida'])
        self.assertIsNone(self.api.get(f'{base}/').data['turno_activo'])
        self.assertEqual(self.api.post(f'{base}/salida/').status_code, 400)

    def test_turno_manual_valida_horas(self):
        ahora = timezone.now()
        url = '/api/empleados/turnos/'
        res = self.api.post(url, {'empleado_id': self.luis.pk, 'entrada': ahora.isoformat(), 'salida': (ahora - timedelta(hours=1)).isoformat()}, format='json')
        self.assertEqual(res.status_code, 400)
        res = self.api.post(url, {'empleado_id': self.luis.pk, 'entrada': (ahora - timedelta(hours=8)).isoformat(), 'salida': ahora.isoformat()}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['horas_trabajadas'], 8.0)

    def test_filtrar_turnos_por_fecha(self):
        hoy = timezone.localdate()
        Turno.objects.create(empleado=self.luis, entrada=timezone.now() - timedelta(days=10), salida=timezone.now() - timedelta(days=10) + timedelta(hours=6))
        Turno.objects.create(empleado=self.luis, entrada=timezone.now() - timedelta(hours=3), salida=timezone.now())
        res = self.api.get(f'/api/empleados/turnos/?desde={hoy - timedelta(days=1)}&hasta={hoy}')
        self.assertEqual(len(res.data), 1)

    def test_solo_admin(self):
        cajero = User.objects.create_user('caja', password='x')
        Empleado.objects.create(usuario=cajero, nombre='C', apellido='C', rol='cajero')
        self.api.force_authenticate(cajero)
        self.assertEqual(self.api.post(f'/api/empleados/empleados/{self.luis.pk}/entrada/').status_code, 403)
        self.assertEqual(self.api.post(f'/api/empleados/empleados/{self.luis.pk}/acceso/', {}, format='json').status_code, 403)
