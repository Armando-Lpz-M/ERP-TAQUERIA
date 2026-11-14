# 🌮 Taquería ERP

> Sistema de gestión integral para las operaciones diarias de una taquería: desde la toma de órdenes hasta el análisis de ventas, en una sola plataforma que funciona en celular, tablet y computadora.

![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-6.0-092E20?style=flat-square&logo=django&logoColor=white)
![DRF](https://img.shields.io/badge/Django_REST_Framework-3.18-ff1709?style=flat-square)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

---

## 📖 ¿Qué es Taquería ERP?

Un ERP desarrollado para resolver un problema real: la administración manual de una taquería es caótica, propensa a errores y difícil de escalar. Centraliza en una aplicación web lo que el negocio necesita para operar:

- Tomar órdenes por mesa o por cliente, desde el celular del mesero
- Mandar los pedidos a cocina y ver su avance en una tablet
- Cobrar en efectivo, tarjeta o transferencia e imprimir el ticket
- Descontar del inventario los ingredientes de cada venta, según su receta
- Administrar menú, inventario, proveedores, empleados y turnos
- Ver reportes de ventas con gráficas y exportarlos a Excel y PDF

---

## ✨ Características

### 🔐 Acceso y roles
- Login con JWT: el *access token* vive solo en memoria y el *refresh token* en una cookie `httpOnly` (no se puede robar con XSS)
- La sesión sobrevive a recargar la página y se renueva sola
- Bloqueo temporal tras varios intentos fallidos (django-axes)
- 4 roles: **Administrador, Cajero, Mesero y Cocina (taquero)**; cada endpoint valida el rol en el backend

### 🧾 Órdenes, cobro y cocina
- Órdenes por mesa o nombre de cliente, con notas por producto ("sin cebolla")
- Menú por categorías con búsqueda; el precio siempre lo pone el servidor
- Pantalla de cocina con pedidos nuevos y en preparación, tiempos de espera y avance de estado
- Cobro con tres métodos de pago, montos rápidos y cálculo de cambio; no permite cobrar dos veces ni órdenes vacías
- Ticket imprimible en papel de 80 mm

### 📦 Menú e inventario
- Productos, categorías, precios, disponibilidad y **recetas** (ingredientes por pieza)
- Al cobrar, se descuentan los ingredientes y queda registrada la salida
- Entradas con costo y proveedor, salidas por merma o ajuste, historial de movimientos
- Alertas de stock bajo y por agotarse
- Los movimientos no se editan ni se borran: un error se corrige con un ajuste

### 👥 Empleados
- Alta con usuario y contraseña, cambio de contraseña, baja y reactivación (la baja conserva el historial)
- Registro de entrada y salida de turnos y horas trabajadas por periodo

### 📊 Reportes
- Calculados en vivo desde los tickets, para cualquier rango de fechas
- Ventas por día, por hora (hora pico), por método de pago y productos más vendidos
- Exportación a **Excel** (resumen, por día, productos y tickets) y **PDF**
- Dashboard con las ventas del día según el rol

### 📱 Interfaz
- Responsiva: revisada en 360, 400, 820, 1024 y 1366 px
- En pantallas táctiles, los controles miden al menos 40 px
- Diseño oscuro con tipografías Bebas Neue + DM Sans
- Gráficas con colores validados para contraste y daltonismo

---

## 🏗️ Arquitectura

```
┌───────────────────────────────────────────┐
│        Frontend (SPA) — frontend/         │
│  React 19 · TypeScript · Tailwind 4       │
│  shadcn/ui · TanStack Query · Recharts    │
└─────────────────────┬─────────────────────┘
                      │ HTTP / JSON
                      │ Bearer (access) + cookie httpOnly (refresh)
┌─────────────────────▼─────────────────────┐
│     Django REST API — taqueria_erp/       │
│  cocina · ventas · inventario ·           │
│  empleados · reportes                     │
│  SimpleJWT · roles · axes · auditoría     │
└─────────────────────┬─────────────────────┘
                      │ psycopg2
┌─────────────────────▼─────────────────────┐
│          PostgreSQL (Supabase)            │
└───────────────────────────────────────────┘
```

En desarrollo, Vite sirve el frontend y reenvía `/api` a Django. En producción, Django sirve el build de React (con WhiteNoise) y la API desde el mismo dominio, sin CORS.

---

## 🛠️ Stack

| Capa | Tecnologías |
|---|---|
| Backend | Python 3.12+, Django 6, Django REST Framework, SimpleJWT, django-axes, django-filter, django-unfold (admin) |
| Archivos | ReportLab (PDF), openpyxl (Excel), Pillow, WhiteNoise |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui (Radix), React Router |
| Datos y formularios | TanStack Query, React Hook Form, Zod |
| Gráficas | Recharts |
| Base de datos | PostgreSQL en Supabase |

---

## 🚀 Instalación

### Requisitos
- Python 3.12 o más nuevo
- Node 26 (con [nvm](https://github.com/nvm-sh/nvm): `nvm install` dentro de `frontend/`)
- Una base de datos PostgreSQL (por ejemplo, un proyecto gratuito en [Supabase](https://supabase.com))

### 1. Backend

```bash
cd taqueria_erp
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Crea `taqueria_erp/.env`:

```env
SECRET_KEY=una-clave-larga-y-aleatoria
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
DATABASE_URL=postgresql://usuario:password@host:5432/postgres?sslmode=require
CORS_ORIGINS=http://127.0.0.1:8000,http://localhost:8000
```

```bash
python manage.py migrate
python manage.py createsuperuser
```

### 2. Frontend

```bash
cd frontend
nvm use
npm install
cp .env.example .env
```

### 3. Desarrollo (dos terminales)

```bash
# Terminal 1
cd taqueria_erp && source venv/bin/activate
python manage.py runserver
```

```bash
# Terminal 2
cd frontend
npm run dev
```

Abre **http://localhost:5173**.

### 4. Producción

```bash
cd frontend && npm run build                 # genera frontend/dist
cd ../taqueria_erp
python manage.py collectstatic --noinput     # copia el build a staticfiles/
```

Con `DEBUG=False`, Django sirve la aplicación completa (frontend y API) desde un solo servidor; usa un servidor WSGI como gunicorn detrás de HTTPS.

### Pruebas

```bash
cd taqueria_erp && python manage.py test      # backend
cd frontend && npm run lint && npm run build  # frontend
```

---

## 🔑 Roles y permisos

| Módulo | Admin | Cajero | Mesero | Cocina |
|---|:-:|:-:|:-:|:-:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Tomar orden | ✅ | ✅ | ✅ (solo las suyas) | ❌ |
| Cobrar | ✅ | ✅ | ❌ | ❌ |
| Cocina | ✅ | ❌ | ❌ | ✅ |
| Menú e inventario | ✅ | ❌ | ❌ | ❌ |
| Empleados | ✅ | ❌ | ❌ | ❌ |
| Reportes | ✅ | ✅ (solo el día de hoy) | ❌ | ❌ |
| Exportar Excel/PDF | ✅ | ❌ | ❌ | ❌ |

La cocina nunca recibe precios ni totales. Los permisos se aplican en el backend; el frontend solo oculta lo que el rol no puede usar.

---

## 🔌 API

### Autenticación
```
POST   /api/auth/login/            Usuario y contraseña → access token + usuario (refresh en cookie)
POST   /api/auth/refresh/          Renueva el access token con la cookie
POST   /api/auth/logout/           Cierra la sesión
GET    /api/me/                    Usuario actual, rol y permisos
```

### Ventas
```
GET    /api/ventas/ordenes/activas/                 Órdenes sin cobrar
POST   /api/ventas/ordenes/                         Crear orden (mesa o cliente, con productos opcionales)
POST   /api/ventas/ordenes/{id}/items/              Agregar producto
PATCH  /api/ventas/ordenes/{id}/items/{item}/       Cambiar cantidad o nota
DELETE /api/ventas/ordenes/{id}/items/{item}/       Quitar producto
POST   /api/ventas/ordenes/{id}/cerrar/             Cobrar y generar ticket
POST   /api/ventas/ordenes/{id}/cancelar/           Cancelar
GET    /api/ventas/ordenes/pendientes-cocina/       Pedidos de cocina (sin precios)
POST   /api/ventas/ordenes/{id}/cambiar-estado/     Avanzar en cocina
```

### Cocina e inventario
```
GET    /api/cocina/productos/menu/                  Menú por categoría
PUT    /api/cocina/productos/{id}/receta/           Ingredientes por pieza
GET    /api/cocina/ingredientes/stock-bajo/         Ingredientes con stock bajo
POST   /api/inventario/entradas/                    Registrar compra
POST   /api/inventario/salidas/                     Registrar merma o ajuste
```

### Empleados
```
POST   /api/empleados/empleados/                    Alta (con usuario y contraseña opcionales)
POST   /api/empleados/empleados/{id}/acceso/        Dar acceso o cambiar contraseña
POST   /api/empleados/empleados/{id}/entrada/       Abrir turno
POST   /api/empleados/empleados/{id}/salida/        Cerrar turno
GET    /api/empleados/turnos/?desde=&hasta=         Turnos por periodo
```

### Reportes
```
GET    /api/reportes/resumen/?desde=&hasta=         Resumen de ventas
GET    /api/reportes/resumen/excel/                 Exportar a Excel
GET    /api/reportes/resumen/pdf/                   Exportar a PDF
```

---

## 📁 Estructura

```
ERP-TAQUERIA/
├── taqueria_erp/              # Backend Django
│   ├── config_erp/            # Configuración, autenticación y servidor del SPA
│   ├── cocina/                # Menú, categorías, ingredientes y recetas
│   ├── ventas/                # Órdenes, cobro y tickets (reglas en services.py)
│   ├── inventario/            # Proveedores, entradas y salidas
│   ├── empleados/             # Empleados, turnos, roles y auditoría
│   ├── reportes/              # Resumen de ventas y exportación
│   └── requirements.txt
└── frontend/                  # Frontend React (ver frontend/README.md)
    └── src/
        ├── features/          # Lógica por módulo: auth, ordenes, cocina, menu, inventario, empleados, reportes
        ├── pages/             # Pantallas
        └── components/        # Componentes compartidos y de shadcn/ui
```

---

## 💡 Decisiones técnicas

**Django + DRF.** Un ORM sólido, migraciones, admin y autenticación integrados: lo más productivo para un ERP con muchos modelos relacionados.

**React + TypeScript + shadcn/ui.** El primer frontend era JavaScript sin framework; al crecer a varios módulos se volvió difícil de mantener. React con TypeScript da componentes reutilizables y tipos; shadcn/ui aporta componentes accesibles que viven dentro del proyecto y se adaptan al diseño.

**Tokens fuera de `localStorage`.** El access token vive en memoria y el refresh token en una cookie `httpOnly` con `SameSite=Strict`: un script inyectado no puede leer la sesión.

**Reglas de negocio en el servidor.** Precios, totales, cobros y descuento de inventario se calculan en el backend dentro de transacciones; el frontend nunca decide un monto.

**Reportes en vivo.** Se calculan desde los tickets para cualquier rango, en lugar de depender de reportes diarios generados a mano.

---

## 📈 Mejoras futuras

- [ ] Idioma inglés en el frontend (react-i18next)
- [ ] Impresión directa de tickets con ESC/POS
- [ ] Notificaciones en tiempo real para cocina (WebSockets)
- [ ] Módulo de nómina a partir de los turnos
- [ ] Órdenes de compra a proveedores
- [ ] Soporte multi-sucursal

---

## 📄 Licencia

MIT.

## 👨‍💻 Autor

**Armando López** — GitHub: [@Armando-Lpz-M](https://github.com/Armando-Lpz-M)

<div align="center">
  <strong>Hecho con ❤️ y 🌮 en México</strong>
</div>
