# ERP-TAQUERIA
# 🌮 Taquería ERP

> Sistema de gestión integral diseñado para optimizar las operaciones diarias de una taquería — desde la toma de órdenes hasta el análisis de ventas, todo en una sola plataforma.

![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-6.0-092E20?style=flat-square&logo=django&logoColor=white)
![DRF](https://img.shields.io/badge/Django_REST_Framework-3.x-ff1709?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-black?style=flat-square&logo=jsonwebtokens)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

---

## 📖 ¿Qué es Taquería ERP?

Taquería ERP es un sistema de gestión empresarial (ERP) desarrollado como proyecto personal para resolver un problema real: la administración manual de una taquería es caótica, propensa a errores y difícil de escalar.

Este sistema centraliza en una sola aplicación web todo lo que necesita una taquería para operar eficientemente:

- Tomar órdenes por mesa o cliente
- Controlar el inventario de ingredientes
- Gestionar al personal y sus roles
- Generar reportes de ventas con gráficas
- Exportar información a Excel y PDF

El proyecto nació con dos objetivos: **resolver un problema real** y **demostrar habilidades fullstack** integrando un backend robusto con Django, una API REST segura con JWT, y un frontend funcional sin depender de frameworks pesados.

---

## 🎯 ¿Por qué se hizo?

En negocios pequeños como taquerías, restaurantes o fondas, es común que:

- Las órdenes se tomen en papel y se pierdan
- No haya control real del inventario
- Los cortes de caja sean manuales y tardados
- No exista forma de saber qué producto se vende más

Este sistema resuelve esos problemas con una interfaz simple que cualquier empleado puede usar desde el primer día, sin necesidad de capacitación técnica.

---

## ✨ Características principales

### 🔐 Autenticación y roles
- Login con tokens JWT (access + refresh)
- 4 roles con permisos diferenciados: **Admin, Cajero, Mesero, Taquero**
- Refresco automático de token sin cerrar sesión
- Protección de rutas en frontend y backend
- Endpoint `/api/me/` para identificar usuario y rol

### 🧾 Gestión de órdenes
- Creación de órdenes por mesa o nombre de cliente
- Menú interactivo agrupado por categorías
- Ticket en tiempo real con suma automática
- Proceso de cobro con 3 métodos de pago
- Cálculo automático de cambio
- Ticket imprimible al finalizar

### 📦 Control de inventario
- Registro de entradas con proveedor y costo
- Registro de salidas y mermas
- Alertas visuales de stock bajo
- Descuento automático de ingredientes al registrar ventas (signals)

### 👥 Gestión de empleados
- Alta de empleados con rol asignado
- Vinculación con usuario de Django
- Control de turnos con cálculo de horas trabajadas

### 📊 Reportes y análisis
- Estadísticas del día en tiempo real
- 4 tipos de gráficas con Chart.js:
  - Ventas por método de pago (barras)
  - Tendencia semanal (línea)
  - Productos más vendidos (barras horizontales)
  - Distribución de ventas (dona)
- Exportación a **Excel** con 3 hojas (ventas, inventario, órdenes)
- Exportación a **PDF** con tablas y gráficas de barras
- Generación automática de reporte al cerrar cada orden

### 🎨 Interfaz
- SPA (Single Page Application) sin frameworks de frontend
- Diseño oscuro profesional con tipografías Bebas Neue + DM Sans
- Sidebar con navegación por roles
- Modales para todas las acciones
- Toast notifications
- Totalmente responsivo

---

## 🏗️ Arquitectura del sistema

```
┌─────────────────────────────────────────┐
│           Frontend (SPA)                │
│     HTML + CSS + JavaScript Vanilla     │
│   Chart.js │ SheetJS │ jsPDF            │
└────────────────┬────────────────────────┘
                 │ HTTP / JSON
                 │ Bearer Token (JWT)
┌────────────────▼────────────────────────┐
│           Django REST API               │
│                                         │
│  ┌─────────┐  ┌──────────┐  ┌────────┐ │
│  │ cocina  │  │  ventas  │  │  inv.  │ │
│  └─────────┘  └──────────┘  └────────┘ │
│  ┌───────────┐  ┌──────────────────┐   │
│  │ empleados │  │    reportes      │   │
│  └───────────┘  └──────────────────┘   │
│                                         │
│  SimpleJWT │ Permissions │ Signals      │
└────────────────┬────────────────────────┘
                 │ psycopg2
┌────────────────▼────────────────────────┐
│         PostgreSQL (Supabase)           │
│              Nube ☁️                    │
└─────────────────────────────────────────┘
```

---

## 🛠️ Stack tecnológico

### Backend
| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Python | 3.13 | Lenguaje base |
| Django | 6.0 | Framework web principal |
| Django REST Framework | 3.x | Construcción de la API REST |
| SimpleJWT | latest | Autenticación con tokens JWT |
| django-unfold | latest | Panel de administración moderno |
| django-cors-headers | latest | Manejo de CORS |
| django-filter | latest | Filtros avanzados en la API |
| dj-database-url | latest | Conexión a PostgreSQL via URL |
| python-decouple | latest | Variables de entorno |
| psycopg2-binary | latest | Driver PostgreSQL para Python |
| Pillow | latest | Manejo de imágenes |

### Frontend
| Tecnología | Uso |
|-----------|-----|
| HTML5 + CSS3 | Estructura y estilos |
| JavaScript ES6+ | Lógica del cliente, fetch API, async/await |
| Chart.js | Gráficas interactivas |
| SheetJS (xlsx) | Exportación a Excel |
| jsPDF + AutoTable | Exportación a PDF |
| Google Fonts | Tipografías (Bebas Neue + DM Sans) |

### Base de datos e infraestructura
| Tecnología | Uso |
|-----------|-----|
| PostgreSQL | Base de datos relacional |
| Supabase | Hosting PostgreSQL en la nube |
| Git + GitHub | Control de versiones |

---

## 📁 Estructura del proyecto

```
taqueria_erp/
├── config_erp/                # Configuración principal de Django
│   ├── settings.py            # Configuración global
│   ├── urls.py                # URLs principales + /api/me/
│   ├── utils.py               # Manejador de errores centralizado
│   ├── wsgi.py
│   └── asgi.py
├── cocina/                    # App: menú, categorías, ingredientes, recetas
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── admin.py
│   └── urls.py
├── ventas/                    # App: órdenes, items, tickets, mesas
│   ├── models.py              # Signal para descontar ingredientes
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── inventario/                # App: entradas, salidas, proveedores
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── empleados/                 # App: empleados, turnos, permisos
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── permissions.py         # Permisos por rol
│   └── urls.py
├── reportes/                  # App: reportes de ventas diarias
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── templates/
│   ├── login.html             # Página de acceso con diseño split-screen
│   └── erp_taqueria.html      # Sistema ERP completo (SPA)
├── static/
├── media/
├── logs/
├── manage.py
├── requirements.txt
└── README.md
```

---

## 🔑 Sistema de roles y permisos

| Módulo | Admin | Cajero | Mesero | Taquero |
|--------|:-----:|:------:|:------:|:-------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Tomar Orden | ✅ | ✅ | ✅ | ✅ |
| Cobrar orden | ✅ | ✅ | ❌ | ❌ |
| Menú (editar) | ✅ | ❌ | ❌ | ❌ |
| Inventario | ✅ | ✅ | ❌ | ❌ |
| Empleados | ✅ | ❌ | ❌ | ❌ |
| Reportes | ✅ | ✅ | ❌ | ❌ |

Los permisos se aplican tanto en el **frontend** (ocultando secciones del sidebar) como en el **backend** (protegiendo cada endpoint de la API).

---

## 🔌 API Endpoints

### Autenticación
```
POST   /api/token/                         Obtener access + refresh token
POST   /api/token/refresh/                 Refrescar access token
GET    /api/me/                            Info y rol del usuario actual
```

### Cocina
```
GET    /api/cocina/productos/menu/         Menú agrupado por categoría
GET    /api/cocina/ingredientes/           Lista de ingredientes
GET    /api/cocina/ingredientes/stock-bajo/ Ingredientes con stock bajo
POST   /api/cocina/productos/             Crear producto
PATCH  /api/cocina/productos/{id}/        Editar producto
```

### Ventas
```
GET    /api/ventas/ordenes/               Lista de órdenes
POST   /api/ventas/ordenes/               Crear orden
GET    /api/ventas/ordenes/abiertas/      Órdenes activas
POST   /api/ventas/ordenes/{id}/cerrar/   Cobrar orden y generar ticket
GET    /api/ventas/tickets/               Historial de tickets
```

### Inventario
```
POST   /api/inventario/entradas/          Registrar entrada de stock
POST   /api/inventario/salidas/           Registrar salida o merma
GET    /api/inventario/proveedores/       Lista de proveedores
```

### Empleados
```
GET    /api/empleados/empleados/          Lista de empleados
POST   /api/empleados/empleados/          Crear empleado
GET    /api/empleados/turnos/activos/     Empleados con turno activo
```

### Reportes
```
POST   /api/reportes/ventas-diarias/generar/   Generar reporte del día
GET    /api/reportes/ventas-diarias/           Historial de reportes
```

---

## 🚀 Instalación y configuración

### Prerrequisitos
- Python 3.10+
- Cuenta en [Supabase](https://supabase.com) (gratuita)
- Git

### 1. Clona el repositorio

```bash
git clone https://github.com/Armando-Lpz-M/ERP-TAQUERIA.git
cd ERP-TAQUERIA/taqueria_erp
```

### 2. Crea y activa el entorno virtual

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python -m venv venv
source venv/bin/activate
```

### 3. Instala las dependencias

```bash
pip install -r requirements.txt
```

### 4. Configura las variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
SECRET_KEY=tu-secret-key-muy-larga-y-aleatoria
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
DATABASE_URL=postgresql://usuario:password@host:5432/nombre_db
CORS_ORIGINS=http://127.0.0.1:8000,http://localhost:8000
```

### 5. Aplica las migraciones

```bash
python manage.py migrate
```

### 6. Crea el superusuario

```bash
python manage.py createsuperuser
```

### 7. Inicia el servidor

```bash
python manage.py runserver
```

Abre `http://127.0.0.1:8000` — serás redirigido al login automáticamente 🎉

---

## 💡 Decisiones técnicas

### ¿Por qué Django y no FastAPI o Flask?
Django ofrece un ORM robusto, sistema de migraciones, admin panel y autenticación integrados. Para un ERP con múltiples modelos relacionados entre sí, Django es la elección más productiva y mantenible.

### ¿Por qué JavaScript Vanilla y no React o Vue?
El objetivo era demostrar dominio de los fundamentos web sin depender de abstracciones. Un frontend en JS puro también es más fácil de desplegar — no requiere node, npm ni proceso de build.

### ¿Por qué Supabase y no un servidor propio?
Supabase ofrece PostgreSQL gestionado con backups automáticos, SSL, y panel visual sin costo inicial. Para un proyecto de portafolio y uso real en pequeña escala es la opción más pragmática.

### ¿Por qué JWT y no sesiones?
JWT permite una arquitectura desacoplada donde el frontend es completamente independiente del backend. Además es el estándar para APIs REST modernas y permite escalar horizontalmente sin estado de sesión en el servidor.

---

## 📈 Posibles mejoras futuras

- [ ] App móvil con React Native o Flutter
- [ ] Impresión real de tickets con ESC/POS
- [ ] Módulo de nómina básica
- [ ] Notificaciones en tiempo real con WebSockets
- [ ] Dashboard con más métricas (ticket promedio, hora pico)
- [ ] Módulo de proveedores con órdenes de compra
- [ ] Soporte multi-sucursal
- [ ] Tests unitarios y de integración

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea tu rama (`git checkout -b feature/nueva-funcionalidad`)
3. Haz commit de tus cambios (`git commit -m 'feat: descripción'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

## 👨‍💻 Autor

**Armando López**
- GitHub: [@Armando-Lpz-M](https://github.com/Armando-Lpz-M)

---

<div align="center">
  <strong>Hecho con ❤️ y 🌮 en México</strong>
  <br/>
  <sub>Un proyecto real para un problema real</sub>
</div>