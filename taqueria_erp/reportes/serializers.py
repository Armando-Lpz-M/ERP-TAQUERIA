from rest_framework import serializers
from .models import ReporteVentaDiaria


class ReporteVentaDiariaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReporteVentaDiaria
        fields = "__all__"


class _DiaSerializer(serializers.Serializer):
    fecha = serializers.DateField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    ordenes = serializers.IntegerField()


class _HoraSerializer(serializers.Serializer):
    hora = serializers.IntegerField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    ordenes = serializers.IntegerField()


class _ProductoSerializer(serializers.Serializer):
    producto = serializers.CharField()
    cantidad = serializers.IntegerField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2)


class ResumenSerializer(serializers.Serializer):
    desde = serializers.DateField()
    hasta = serializers.DateField()
    total_ventas = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_ordenes = serializers.IntegerField()
    ticket_promedio = serializers.DecimalField(max_digits=12, decimal_places=2)
    ordenes_canceladas = serializers.IntegerField()
    por_metodo = serializers.DictField(child=serializers.DecimalField(max_digits=12, decimal_places=2))
    por_dia = _DiaSerializer(many=True)
    por_hora = _HoraSerializer(many=True)
    top_productos = _ProductoSerializer(many=True)
