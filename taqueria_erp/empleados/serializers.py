from rest_framework import serializers
from .models import Empleado, Turno


class EmpleadoSerializer(serializers.ModelSerializer):
    usuario_username = serializers.CharField(
        source='usuario.username', read_only=True
    )

    class Meta:
        model = Empleado
        fields = (
            'id', 'usuario_username', 'nombre', 'apellido',
            'rol', 'telefono', 'activo', 'fecha_ingreso'
        )


class TurnoSerializer(serializers.ModelSerializer):
    empleado = EmpleadoSerializer(read_only=True)
    empleado_id = serializers.PrimaryKeyRelatedField(
        queryset=Empleado.objects.all(), source='empleado', write_only=True
    )
    horas_trabajadas = serializers.FloatField(read_only=True)

    class Meta:
        model = Turno
        fields = ('id', 'empleado', 'empleado_id', 'entrada', 'salida', 'horas_trabajadas', 'notas')