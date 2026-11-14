from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Empleado, Turno


def _validar_password(password, user=None):
    try:
        validate_password(password, user=user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(list(exc.messages)) from exc
    return password


class EmpleadoSerializer(serializers.ModelSerializer):
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)
    tiene_acceso = serializers.SerializerMethodField()
    turno_activo = serializers.SerializerMethodField()
    # Opcionales al crear: le dan acceso al sistema al nuevo empleado
    username = serializers.CharField(write_only=True, required=False, max_length=150)
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})

    class Meta:
        model = Empleado
        fields = (
            'id', 'usuario_username', 'tiene_acceso', 'turno_activo', 'nombre', 'apellido',
            'rol', 'telefono', 'activo', 'fecha_ingreso', 'username', 'password',
        )
        read_only_fields = ('fecha_ingreso',)

    def get_tiene_acceso(self, obj):
        return obj.usuario_id is not None

    def get_turno_activo(self, obj):
        """Hora de entrada del turno abierto, si lo hay."""
        abiertos = getattr(obj, 'turnos_abiertos', None)
        if abiertos is None:
            abiertos = list(obj.turnos.filter(salida__isnull=True)[:1])
        return abiertos[0].entrada if abiertos else None

    def validate(self, attrs):
        username, password = attrs.get('username'), attrs.get('password')
        if self.instance is not None and (username or password):
            raise serializers.ValidationError('Usa /acceso/ para cambiar el usuario o la contraseña.')
        if bool(username) != bool(password):
            raise serializers.ValidationError({'password' if username else 'username': 'Indica usuario y contraseña.'})
        if username:
            if User.objects.filter(username__iexact=username).exists():
                raise serializers.ValidationError({'username': 'Ese usuario ya existe.'})
            try:
                _validar_password(password, User(username=username, first_name=attrs.get('nombre', '')))
            except serializers.ValidationError as exc:
                raise serializers.ValidationError({'password': exc.detail}) from exc
        return attrs

    def create(self, validated_data):
        username = validated_data.pop('username', None)
        password = validated_data.pop('password', None)
        if username:
            validated_data['usuario'] = User.objects.create_user(
                username=username,
                password=password,
                first_name=validated_data.get('nombre', ''),
                last_name=validated_data.get('apellido', ''),
            )
        return super().create(validated_data)


class AccesoSerializer(serializers.Serializer):
    """Crea la cuenta de un empleado que no tiene, o le cambia la contraseña."""
    username = serializers.CharField(required=False, max_length=150)
    password = serializers.CharField(style={'input_type': 'password'})

    def validate(self, attrs):
        empleado = self.context['empleado']
        user = empleado.usuario
        if user is None:
            username = attrs.get('username')
            if not username:
                raise serializers.ValidationError({'username': 'Indica el nombre de usuario.'})
            if User.objects.filter(username__iexact=username).exists():
                raise serializers.ValidationError({'username': 'Ese usuario ya existe.'})
            user = User(username=username, first_name=empleado.nombre, last_name=empleado.apellido)
        try:
            _validar_password(attrs['password'], user)
        except serializers.ValidationError as exc:
            raise serializers.ValidationError({'password': exc.detail}) from exc
        return attrs


class TurnoSerializer(serializers.ModelSerializer):
    empleado = EmpleadoSerializer(read_only=True)
    empleado_id = serializers.PrimaryKeyRelatedField(
        queryset=Empleado.objects.all(), source='empleado', write_only=True
    )
    horas_trabajadas = serializers.FloatField(read_only=True)

    class Meta:
        model = Turno
        fields = ('id', 'empleado', 'empleado_id', 'entrada', 'salida', 'horas_trabajadas', 'notas')

    def validate(self, attrs):
        entrada = attrs.get('entrada', getattr(self.instance, 'entrada', None))
        salida = attrs.get('salida', getattr(self.instance, 'salida', None))
        empleado = attrs.get('empleado', getattr(self.instance, 'empleado', None))
        if entrada and salida and salida <= entrada:
            raise serializers.ValidationError({'salida': 'La salida debe ser después de la entrada.'})
        if salida is None and empleado is not None:
            abiertos = Turno.objects.filter(empleado=empleado, salida__isnull=True)
            if self.instance is not None:
                abiertos = abiertos.exclude(pk=self.instance.pk)
            if abiertos.exists():
                raise serializers.ValidationError('Este empleado ya tiene un turno abierto.')
        return attrs
