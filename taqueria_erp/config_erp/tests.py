from django.contrib.auth.models import AnonymousUser
from django.conf import settings
from django.test import RequestFactory, SimpleTestCase, override_settings
from django.template.loader import render_to_string
from django.urls import reverse
from config_erp.urls import ERPAccessView


class InternationalizationTests(SimpleTestCase):
    def test_language_can_be_changed_with_post(self):
        response = self.client.post(
            reverse('set_language'),
            {'language': 'es-mx', 'next': '/login/'},
            HTTP_HOST='localhost',
            secure=True,
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.cookies['django_language'].value, 'es-mx')

        login_response = self.client.get('/login/', HTTP_HOST='localhost', secure=True)
        self.assertContains(login_response, '<html lang="es-mx">', html=False)
        self.assertContains(login_response, 'value="es-mx" selected', html=False)

    def test_javascript_catalog_responds_for_supported_languages(self):
        expected_messages = {
            'es-mx': 'Men\\u00fa en modo de demostraci\\u00f3n',
            'en': 'Menu in demo mode',
        }
        for language, expected_message in expected_messages.items():
            with self.subTest(language=language):
                response = self.client.get(
                    reverse('javascript-catalog'),
                    HTTP_HOST='localhost',
                    HTTP_ACCEPT_LANGUAGE=language,
                    secure=True,
                )
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.headers['Content-Language'], language)
                self.assertContains(response, expected_message, html=False)

    @override_settings(CURRENCY_CODE='USD', TIME_ZONE='America/Mexico_City')
    def test_currency_and_timezone_settings_reach_erp_template(self):
        request = RequestFactory().get('/erp/', HTTP_HOST='localhost')
        request.user = AnonymousUser()
        view = ERPAccessView()
        view.setup(request)
        context = view.get_context_data()
        markup = render_to_string(view.template_name, context, request=request)

        self.assertIn('data-currency-code="USD"', markup)
        self.assertIn(f'data-time-zone="{settings.TIME_ZONE}"', markup)
