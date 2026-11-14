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

## Estructura

```
src/
├── components/ui/   # Componentes de shadcn/ui (se agregan con `npx shadcn add <nombre>`)
├── hooks/           # Hooks reutilizables
├── lib/             # Utilidades (cn, cliente de la API, formatos)
├── providers/       # Providers globales: TanStack Query, tooltips, toasts
├── App.tsx
├── main.tsx
└── index.css        # Tema: paleta de la taquería y fuentes (Bebas Neue + DM Sans)
```

## Tema

Los colores se definen como variables CSS en `src/index.css`, con la misma paleta oscura del ERP original. Las clases principales son `bg-primary` (ámbar), `text-destructive` (rojo), `text-success` (verde), `text-info` (azul) y `font-display` (Bebas Neue para títulos grandes).
