from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from empleados.models import Empleado

from .models import Categoria, Ingrediente, Producto, RecetaIngrediente


@override_settings(SECURE_SSL_REDIRECT=False, AXES_ENABLED=False)
class MenuTests(TestCase):
    """Qué ve cada rol del menú y qué datos sensibles (recetas, costos) se quedan en el backend."""

    @classmethod
    def setUpTestData(cls):
        cls.usuarios = {}
        for rol, rol_empleado in {'admin': 'admin', 'cajero': 'cajero', 'mesero': 'mesero', 'cocina': 'taquero'}.items():
            user = User.objects.create_user(username=rol, password='test-only')
            cls.usuarios[rol] = Empleado.objects.create(usuario=user, nombre=rol, apellido='T', rol=rol_empleado)

        cls.tacos = Categoria.objects.create(nombre='Tacos')
        bebidas = Categoria.objects.create(nombre='Bebidas')
        Categoria.objects.create(nombre='Vieja', activo=False)
        cls.pastor = Producto.objects.create(nombre='Pastor', categoria=cls.tacos, precio='18.00')
        Producto.objects.create(nombre='Agotado', categoria=cls.tacos, precio='10.00', disponible=False)
        Producto.objects.create(nombre='Agua', categoria=bebidas, precio='25.00')
        cls.tortilla = Ingrediente.objects.create(nombre='Tortilla', unidad='pza', stock_actual='100')
        cls.inactivo = Ingrediente.objects.create(nombre='Viejo', unidad='kg', activo=False)
        RecetaIngrediente.objects.create(producto=cls.pastor, ingrediente=cls.tortilla, cantidad='2')

    def como(self, rol):
        api = APIClient()
        api.force_authenticate(self.usuarios[rol].usuario)
        return api

    def test_menu_agrupa_por_categoria_y_solo_muestra_lo_disponible(self):
        res = self.como('mesero').get('/api/cocina/productos/menu/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual([c['categoria'] for c in res.data], ['Bebidas', 'Tacos'])
        self.assertEqual([p['nombre'] for p in res.data[1]['productos']], ['Pastor'])

    def test_cajero_y_mesero_ven_precio_pero_no_receta(self):
        for rol in ('cajero', 'mesero'):
            with self.subTest(rol=rol):
                res = self.como(rol).get(f'/api/cocina/productos/{self.pastor.pk}/')
                self.assertEqual(res.status_code, 200)
                self.assertEqual(res.data['precio'], '18.00')
                self.assertNotIn('receta', res.data)
                self.assertNotIn('descripcion', res.data)

    def test_solo_admin_ve_productos_no_disponibles(self):
        nombres = lambda api: {p['nombre'] for p in api.get('/api/cocina/productos/').data}
        self.assertIn('Agotado', nombres(self.como('admin')))
        self.assertNotIn('Agotado', nombres(self.como('cajero')))
        self.assertEqual(self.como('cajero').get('/api/cocina/productos/?disponible=false').data, [])

    def test_cocina_no_consulta_el_menu_porque_trae_precios(self):
        api = self.como('cocina')
        for ruta in ('/api/cocina/productos/', '/api/cocina/productos/menu/', f'/api/cocina/productos/{self.pastor.pk}/', '/api/cocina/categorias/'):
            with self.subTest(ruta=ruta):
                self.assertEqual(api.get(ruta).status_code, 403)

    def test_receta_solo_acepta_ingredientes_activos(self):
        res = self.como('admin').put(
            f'/api/cocina/productos/{self.pastor.pk}/receta/',
            {'ingredientes': [{'ingrediente_id': self.inactivo.pk, 'cantidad': '1'}]},
            format='json',
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self.pastor.receta.count(), 1)

    def test_receta_vacia_quita_todos_los_ingredientes(self):
        res = self.como('admin').put(f'/api/cocina/productos/{self.pastor.pk}/receta/', {'ingredientes': []}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(self.pastor.receta.count(), 0)

    def test_precio_y_categoria_validos(self):
        api = self.como('admin')
        for datos in (
            {'nombre': 'Gratis', 'categoria_id': self.tacos.pk, 'precio': '0.00'},
            {'nombre': 'Negativo', 'categoria_id': self.tacos.pk, 'precio': '-5'},
            {'nombre': 'Sin categoría', 'precio': '10'},
        ):
            with self.subTest(datos=datos):
                self.assertEqual(api.post('/api/cocina/productos/', datos, format='json').status_code, 400)

    def test_stock_bajo_incluye_el_stock_exacto_en_el_minimo(self):
        Ingrediente.objects.create(nombre='Cebolla', unidad='kg', stock_actual='2', stock_minimo='2')
        Ingrediente.objects.create(nombre='Limón', unidad='kg', stock_actual='5', stock_minimo='1')
        res = self.como('admin').get('/api/cocina/ingredientes/stock-bajo/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual([i['nombre'] for i in res.data], ['Cebolla'])
        self.assertTrue(res.data[0]['stock_bajo'])
