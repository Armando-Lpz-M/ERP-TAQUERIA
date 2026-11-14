def registrar_evento(*, usuario, accion, objeto=None, anterior=None, nuevo=None, detalle=None, request=None):
    """Persist a security/business audit event without exposing request payloads."""
    from .models import EventoAuditoria

    ip_address = None
    if request is not None:
        forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
        ip_address = (forwarded_for.split(',')[0].strip() if forwarded_for else request.META.get('REMOTE_ADDR'))

    EventoAuditoria.objects.create(
        usuario=usuario if getattr(usuario, 'is_authenticated', False) else None,
        accion=accion,
        objeto_tipo=objeto.__class__.__name__ if objeto is not None else '',
        objeto_id=str(objeto.pk) if objeto is not None and objeto.pk is not None else '',
        valor_anterior=anterior,
        valor_nuevo=nuevo,
        detalle=detalle or {},
        ip_address=ip_address,
    )


class AuditedViewSetMixin:
    def perform_destroy(self, instance):
        registrar_evento(
            usuario=self.request.user,
            accion='cancelacion_ticket' if instance.__class__.__name__ == 'Ticket' else 'eliminacion',
            objeto=instance,
            request=self.request,
        )
        super().perform_destroy(instance)


class AuditedModelAdminMixin:
    def save_model(self, request, obj, form, change):
        old_obj = self.model.objects.filter(pk=obj.pk).first() if change else None
        previous_price = getattr(old_obj, 'precio', None) if old_obj else None
        previous_role = getattr(old_obj, 'rol', None) if old_obj else None
        super().save_model(request, obj, form, change)

        if obj.__class__.__name__ == 'Empleado':
            from .permissions import sincronizar_grupos_rol

            sincronizar_grupos_rol(obj)

        if old_obj is None:
            return
        if previous_price is not None and previous_price != getattr(obj, 'precio', None):
            registrar_evento(
                usuario=request.user,
                accion='cambio_precio',
                objeto=obj,
                anterior=previous_price,
                nuevo=obj.precio,
                request=request,
            )
        if previous_role is not None and previous_role != getattr(obj, 'rol', None):
            registrar_evento(
                usuario=request.user,
                accion='cambio_rol',
                objeto=obj,
                detalle={'anterior': previous_role, 'nuevo': obj.rol},
                request=request,
            )

    def save_related(self, request, form, formsets, change):
        obj = form.instance
        relation = 'groups' if hasattr(obj, 'groups') else 'permissions' if hasattr(obj, 'permissions') else None
        previous = set(getattr(obj, relation).values_list('name' if relation == 'groups' else 'codename', flat=True)) if relation else set()
        super().save_related(request, form, formsets, change)
        if relation:
            current = set(getattr(obj, relation).values_list('name' if relation == 'groups' else 'codename', flat=True))
            if previous != current:
                registrar_evento(
                    usuario=request.user,
                    accion='cambio_rol' if relation == 'groups' else 'cambio_permisos',
                    objeto=obj,
                    detalle={'anterior': sorted(previous), 'nuevo': sorted(current)},
                    request=request,
                )

    def delete_model(self, request, obj):
        registrar_evento(usuario=request.user, accion='eliminacion', objeto=obj, request=request)
        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        for obj in queryset.iterator():
            registrar_evento(usuario=request.user, accion='eliminacion', objeto=obj, request=request)
        super().delete_queryset(request, queryset)
