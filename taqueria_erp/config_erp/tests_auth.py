from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from config_erp.auth_views import REFRESH_COOKIE
from empleados.models import Empleado


@override_settings(AXES_ENABLED=False)
class AuthCookieTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.admin = User.objects.create_superuser('jefe', 'jefe@example.com', 'clave-segura-123')
        self.sin_rol = User.objects.create_user('visitante', password='clave-segura-123')

    def login(self, username='jefe', password='clave-segura-123'):
        return self.client.post('/api/auth/login/', {'username': username, 'password': password}, format='json')

    def test_login_devuelve_access_y_guarda_refresh_en_cookie_httponly(self):
        res = self.login()
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.data)
        self.assertNotIn('refresh', res.data)
        self.assertEqual(res.data['user']['rol'], 'admin')
        cookie = res.cookies[REFRESH_COOKIE]
        self.assertTrue(cookie['httponly'])
        self.assertEqual(cookie['samesite'], 'Strict')
        self.assertEqual(cookie['path'], '/api/auth/')

    def test_login_con_password_incorrecto(self):
        res = self.login(password='mala')
        self.assertEqual(res.status_code, 401)
        self.assertNotIn(REFRESH_COOKIE, res.cookies)

    def test_login_sin_rol_erp_es_rechazado(self):
        res = self.login(username='visitante')
        self.assertEqual(res.status_code, 403)
        self.assertNotIn(REFRESH_COOKIE, res.cookies)

    def test_login_empleado_taquero_tiene_rol_cocina(self):
        user = get_user_model().objects.create_user('taco', password='clave-segura-123')
        Empleado.objects.create(usuario=user, nombre='Carlos', apellido='H', rol='taquero', activo=True)
        res = self.login(username='taco')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['user']['rol'], 'cocina')

    def test_refresh_con_cookie_restaura_sesion(self):
        self.login()
        res = self.client.post('/api/auth/refresh/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.data)
        self.assertEqual(res.data['user']['username'], 'jefe')

        me = self.client.get('/api/me/', HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data['rol'], 'admin')

    def test_refresh_sin_cookie(self):
        res = self.client.post('/api/auth/refresh/')
        self.assertEqual(res.status_code, 401)

    def test_refresh_con_cookie_invalida(self):
        self.client.cookies[REFRESH_COOKIE] = 'no-es-un-token'
        res = self.client.post('/api/auth/refresh/')
        self.assertEqual(res.status_code, 401)

    def test_refresh_rechaza_usuario_desactivado(self):
        self.login()
        self.admin.is_active = False
        self.admin.save()
        res = self.client.post('/api/auth/refresh/')
        self.assertIn(res.status_code, (401, 403))

    def test_logout_borra_cookie(self):
        self.login()
        res = self.client.post('/api/auth/logout/')
        self.assertEqual(res.status_code, 204)
        self.assertEqual(res.cookies[REFRESH_COOKIE].value, '')
        self.assertEqual(self.client.post('/api/auth/refresh/').status_code, 401)


@override_settings(AXES_ENABLED=True, AXES_FAILURE_LIMIT=3)
class AuthBloqueoTests(TestCase):
    def test_bloquea_despues_de_varios_intentos_fallidos(self):
        get_user_model().objects.create_superuser('jefe', 'jefe@example.com', 'clave-segura-123')
        client = APIClient()
        for _ in range(3):
            client.post('/api/auth/login/', {'username': 'jefe', 'password': 'mala'}, format='json')
        # Aun con la contraseña correcta, la cuenta queda bloqueada temporalmente
        res = client.post('/api/auth/login/', {'username': 'jefe', 'password': 'clave-segura-123'}, format='json')
        self.assertNotEqual(res.status_code, 200)
        self.assertNotIn(REFRESH_COOKIE, res.cookies)
