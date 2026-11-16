"""Revocación de sesiones del ERP (lista negra de refresh tokens de SimpleJWT)."""
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken


def revocar_sesiones(user):
    """
    Invalida todos los refresh tokens del usuario: tendrá que volver a iniciar sesión
    en todos sus dispositivos. Los access tokens que ya tenga caducan solos en minutos.
    """
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)
