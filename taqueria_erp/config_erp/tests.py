import tempfile
from pathlib import Path

from django.test import SimpleTestCase, override_settings
from django.urls import reverse


@override_settings(SECURE_SSL_REDIRECT=False)
class InternationalizationTests(SimpleTestCase):
    def test_language_can_be_changed_with_post(self):
        response = self.client.post(reverse('set_language'), {'language': 'es-mx', 'next': '/'}, HTTP_HOST='localhost')
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.cookies['django_language'].value, 'es-mx')


@override_settings(SECURE_SSL_REDIRECT=False, ADMIN_URL='gestion-privada/')
class SpaTests(SimpleTestCase):
    """Django entrega el index.html de React para las rutas del frontend."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.tmp = tempfile.TemporaryDirectory()
        Path(cls.tmp.name, 'index.html').write_text('<!doctype html><div id="root"></div>', encoding='utf-8')

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()
        super().tearDownClass()

    def test_rutas_del_frontend_devuelven_index(self):
        with self.settings(FRONTEND_DIST=Path(self.tmp.name)):
            for ruta in ('/', '/login', '/ordenes/12', '/reportes'):
                with self.subTest(ruta=ruta):
                    res = self.client.get(ruta)
                    self.assertEqual(res.status_code, 200)
                    self.assertIn(b'id="root"', b''.join(res.streaming_content))
                    self.assertIn('no-cache', res['Cache-Control'])

    def test_rutas_de_api_y_admin_no_caen_en_el_frontend(self):
        with self.settings(FRONTEND_DIST=Path(self.tmp.name)):
            self.assertEqual(self.client.get('/api/no-existe/').status_code, 404)
            self.assertEqual(self.client.get('/api/me/').status_code, 401)
            self.assertIn(self.client.get('/gestion-privada/').status_code, (301, 302))

    def test_sin_build_avisa_que_falta_compilar(self):
        with self.settings(FRONTEND_DIST=Path(self.tmp.name) / 'no-existe'):
            res = self.client.get('/')
            self.assertEqual(res.status_code, 503)
            self.assertIn('npm run build', res.content.decode())

    def test_endpoints_viejos_retirados(self):
        with self.settings(FRONTEND_DIST=Path(self.tmp.name)):
            for ruta in ('/api/token/', '/api/token/refresh/', '/api/session-login/'):
                with self.subTest(ruta=ruta):
                    self.assertEqual(self.client.post(ruta).status_code, 404)
