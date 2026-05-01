from rest_framework import serializers
from .models import ReporteVentaDiaria


class ReporteVentaDiariaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReporteVentaDiaria
        fields = "__all__"