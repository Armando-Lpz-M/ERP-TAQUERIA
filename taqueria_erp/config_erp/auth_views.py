"""
Autenticación para el frontend de React.

- El access token se devuelve en el cuerpo de la respuesta y el frontend
  lo guarda solo en memoria.
- El refresh token viaja en una cookie httpOnly que JavaScript no puede leer,
  así un ataque XSS no puede robar la sesión desde localStorage.
"""
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings as jwt_settings
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from empleados.permissions import rol_usuario

ROLES_ERP = {'admin', 'cajero', 'mesero', 'cocina'}

PERMISOS_POR_ROL = {
    'admin': ['*'],
    'cajero': ['ordenes:create', 'ordenes:close', 'ventas:day', 'menu:read'],
    'mesero': ['ordenes:create', 'ordenes:own:update', 'menu:read'],
    'cocina': ['ordenes:kitchen:read', 'ordenes:kitchen:advance'],
}

REFRESH_COOKIE = 'erp_refresh'
REFRESH_COOKIE_PATH = '/api/auth/'


def datos_usuario(user):
    """Información del usuario que necesita el frontend (también la usa /api/me/)."""
    rol = rol_usuario(user)
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'nombre': user.get_full_name() or user.username,
        'is_superuser': user.is_superuser,
        'rol': rol,
        'permisos': PERMISOS_POR_ROL.get(rol, []),
    }


def _guardar_refresh(response, refresh_token):
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        max_age=int(jwt_settings.REFRESH_TOKEN_LIFETIME.total_seconds()),
        httponly=True,
        secure=not settings.DEBUG,
        samesite='Strict',
        path=REFRESH_COOKIE_PATH,
    )


def _borrar_refresh(response):
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_COOKIE_PATH, samesite='Strict')


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def login(request):
    """Recibe usuario y contraseña; devuelve access token + datos del usuario."""
    serializer = TokenObtainPairSerializer(data=request.data, context={'request': request})
    try:
        serializer.is_valid(raise_exception=True)
    except (AuthenticationFailed, TokenError, InvalidToken):
        return Response({'detail': 'Usuario o contraseña incorrectos.'}, status=status.HTTP_401_UNAUTHORIZED)

    user = serializer.user
    if rol_usuario(user) not in ROLES_ERP:
        return Response(
            {'detail': 'Tu cuenta no tiene un rol activo en el ERP.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    response = Response({'access': serializer.validated_data['access'], 'user': datos_usuario(user)})
    _guardar_refresh(response, serializer.validated_data['refresh'])
    return response


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def refresh(request):
    """Usa la cookie httpOnly para emitir un nuevo access token (restaura la sesión al recargar)."""
    token = request.COOKIES.get(REFRESH_COOKIE)
    if not token:
        return Response({'detail': 'No hay sesión activa.'}, status=status.HTTP_401_UNAUTHORIZED)

    serializer = TokenRefreshSerializer(data={'refresh': token})
    try:
        serializer.is_valid(raise_exception=True)
    except (TokenError, InvalidToken):
        response = Response({'detail': 'La sesión expiró.'}, status=status.HTTP_401_UNAUTHORIZED)
        _borrar_refresh(response)
        return response

    access = serializer.validated_data['access']
    user_id = AccessToken(access).payload.get(jwt_settings.USER_ID_CLAIM)
    usuario = get_user_model().objects.filter(pk=user_id, is_active=True).first()
    if usuario is None or rol_usuario(usuario) not in ROLES_ERP:
        response = Response({'detail': 'Tu cuenta ya no tiene acceso al ERP.'}, status=status.HTTP_403_FORBIDDEN)
        _borrar_refresh(response)
        return response

    response = Response({'access': access, 'user': datos_usuario(usuario)})
    if 'refresh' in serializer.validated_data:  # solo si ROTATE_REFRESH_TOKENS está activo
        _guardar_refresh(response, serializer.validated_data['refresh'])
    return response


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def logout(request):
    """Revoca el refresh token y borra su cookie: aunque alguien la haya copiado, ya no sirve."""
    token = request.COOKIES.get(REFRESH_COOKIE)
    if token:
        try:
            RefreshToken(token).blacklist()
        except TokenError:
            pass  # ya había expirado o no era válido: no hay nada que revocar
    response = Response(status=status.HTTP_204_NO_CONTENT)
    _borrar_refresh(response)
    return response
