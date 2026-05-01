from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Mesa, Orden, ItemOrden, Ticket
from .serializers import MesaSerializer, OrdenSerializer, ItemOrdenSerializer, TicketSerializer


class MesaViewSet(viewsets.ModelViewSet):
    queryset = Mesa.objects.filter(activa=True)
    serializer_class = MesaSerializer


class OrdenViewSet(viewsets.ModelViewSet):
    queryset = Orden.objects.all()
    serializer_class = OrdenSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ("estado", "mesa")

    @action(detail=False, methods=["get"], url_path="abiertas")
    def abiertas(self, request):
        ordenes = Orden.objects.filter(estado="abierta")
        serializer = self.get_serializer(ordenes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="cerrar")
    def cerrar(self, request, pk=None):
        orden = self.get_object()
        orden.estado = "pagada"
        orden.save()
        ticket = Ticket.objects.create(
            orden=orden,
            total=orden.total,
            metodo_pago=request.data.get("metodo_pago", "efectivo"),
            pagado_con=request.data.get("pagado_con"),
        )
        return Response(TicketSerializer(ticket).data)


class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ("metodo_pago",)