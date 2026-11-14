"""Sirve el frontend de React (frontend/dist) para todas las rutas que no son de la API."""
from django.conf import settings
from django.http import FileResponse, HttpResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_safe


@require_safe
@never_cache  # index.html siempre fresco; los JS/CSS con hash sí se guardan en caché
def spa(request, ruta=''):
    index = settings.FRONTEND_DIST / 'index.html'
    if not index.is_file():
        return HttpResponse(
            'El frontend no está compilado. Ejecuta "npm run build" en la carpeta frontend.',
            status=503,
            content_type='text/plain; charset=utf-8',
        )
    return FileResponse(index.open('rb'), content_type='text/html; charset=utf-8')
