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
│   ├── ui/              # Componentes de shadcn/ui (se agregan con `npx shadcn add <nombre>`)
│   └── app-sidebar.tsx  # Menú lateral filtrado por rol
├── features/auth/       # Sesión: contexto, provider, guardias de rutas y tipos
├── hooks/
├── layouts/             # Layout principal (sidebar + encabezado)
├── lib/
│   ├── api.ts           # Cliente de la API (token en memoria + renovación automática)
│   ├── navigation.ts    # Módulos, roles y menú
│   └── utils.ts
├── pages/               # Pantallas: login, dashboard, sin permiso, 404…
├── providers/           # TanStack Query, tooltips y toasts
├── router.tsx           # Rutas protegidas
├── main.tsx
└── index.css            # Tema: paleta de la taquería y fuentes (Bebas Neue + DM Sans)
```

## Tema

Los colores se definen como variables CSS en `src/index.css`, con la misma paleta oscura del ERP original. Las clases principales son `bg-primary` (ámbar), `text-destructive` (rojo), `text-success` (verde), `text-info` (azul) y `font-display` (Bebas Neue para títulos grandes).
