# Taquería ERP — Frontend

Interfaz web del ERP, construida con React y conectada a la API REST de Django (`../taqueria_erp`).

## Stack

| Tecnología | Uso |
|---|---|
| React 19 + TypeScript | Interfaz y tipado |
| Vite 8 | Servidor de desarrollo y build |
| Tailwind CSS 4 | Estilos |
| shadcn/ui (Radix) | Componentes: diálogos, tablas, formularios, sidebar, toasts |
| TanStack Query | Llamadas a la API, caché y recarga de datos |
| React Router | Navegación y rutas protegidas por rol |
| React Hook Form + Zod | Formularios y validación |
| Oxlint | Linter |

## Requisitos

- Node 26 (ver `.nvmrc`; con nvm basta `nvm use`)
- El backend de Django corriendo en `http://127.0.0.1:8000`

## Primeros pasos

```bash
cd frontend
nvm use
npm install
cp .env.example .env   # solo la primera vez
npm run dev            # http://localhost:5173
```

En desarrollo, Vite reenvía todo lo que empieza con `/api` a Django (proxy en `vite.config.ts`), así que el frontend nunca escribe la URL del backend en el código y no hay problemas de CORS.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Revisa tipos y genera la versión de producción en `dist/` |
| `npm run preview` | Sirve localmente la versión de `dist/` |
| `npm run lint` | Revisa el código con Oxlint |

## Variables de entorno

| Variable | Default | Uso |
|---|---|---|
| `DJANGO_URL` | `http://127.0.0.1:8000` | A dónde reenvía el proxy de Vite las llamadas a `/api` |
| `VITE_API_URL` | `/api` | Prefijo de la API que usa el frontend |

## Autenticación

- `POST /api/auth/login/` devuelve el **access token** (se guarda solo en memoria) y los datos del usuario.
- El **refresh token** viaja en una cookie `httpOnly` (`erp_refresh`, ruta `/api/auth/`): JavaScript no puede leerla, así que un ataque XSS no puede robar la sesión.
- Al recargar la página, `POST /api/auth/refresh/` usa esa cookie para restaurar la sesión.
- Si una petición responde 401, `src/lib/api.ts` renueva el token una vez y reintenta; si no se puede, regresa al login.
- `POST /api/auth/logout/` borra la cookie.

## Roles y navegación

El menú y las rutas salen de una sola lista en `src/lib/navigation.ts`. Cada módulo indica qué roles lo pueden ver (`admin`, `cajero`, `mesero`, `cocina`), con los mismos permisos que valida el backend. Si un rol entra a una URL que no le corresponde, ve la pantalla "Sin permiso".

## Estructura

```
src/
├── components/
│   ├── ui/                  # Componentes de shadcn/ui (se agregan con `npx shadcn add <nombre>`)
│   ├── app-sidebar.tsx      # Menú lateral filtrado por rol
│   ├── responsive-table.tsx # Tabla en pantallas anchas, tarjetas en angostas (container queries)
│   └── …                    # Diálogo de confirmación, campo de formulario, cargador
├── features/                # Un módulo por área: api.ts (TanStack Query), tipos y diálogos
│   ├── auth/  ordenes/  cocina/  menu/  inventario/  empleados/  reportes/
├── hooks/
├── layouts/                 # Layout principal (sidebar + encabezado)
├── lib/                     # Cliente de la API, navegación por rol, formatos, formularios
├── pages/                   # Pantallas (las pesadas se cargan bajo demanda en lazy-pages.tsx)
├── providers/               # TanStack Query, tooltips y toasts
├── router.tsx               # Rutas protegidas por sesión y rol
└── index.css                # Tema, colores de gráficas y tamaños táctiles
```

## Producción

`npm run build` genera `dist/` con los archivos bajo `/static/app/`. Django los sirve con WhiteNoise y entrega `index.html` para cualquier ruta que no sea de la API (ver `taqueria_erp/config_erp/spa.py`). Después del build ejecuta `python manage.py collectstatic` en el backend.

## Responsivo

- Las tablas y barras de herramientas se adaptan al **espacio del contenido** (`@container/main`), no al ancho de la pantalla, así funcionan igual con o sin el menú lateral.
- En pantallas táctiles (`pointer: coarse`) botones, pestañas y campos miden al menos 40 px.
- Revisado en 360, 400, 820, 1024 y 1366 px.

## Tema

Los colores se definen como variables CSS en `src/index.css`, con la misma paleta oscura del ERP original. Las clases principales son `bg-primary` (ámbar), `text-destructive` (rojo), `text-success` (verde), `text-info` (azul) y `font-display` (Bebas Neue para títulos grandes).
