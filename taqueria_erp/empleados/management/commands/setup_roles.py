from django.contrib.auth.models import Group, Permission, User
from django.core.management.base import BaseCommand
from empleados.models import Empleado
from empleados.permissions import sincronizar_grupos_rol


ROLE_PERMISSIONS = {
    'dueño': {
        'auth': ['add_user', 'change_user', 'delete_user', 'view_user', 'add_group', 'change_group', 'delete_group', 'view_group'],
        'empleados': ['add_empleado', 'change_empleado', 'delete_empleado', 'view_empleado', 'add_turno', 'change_turno', 'delete_turno', 'view_turno', 'view_eventoauditoria'],
        'cocina': ['add_categoria', 'change_categoria', 'delete_categoria', 'view_categoria', 'add_ingrediente', 'change_ingrediente', 'delete_ingrediente', 'view_ingrediente', 'add_producto', 'change_producto', 'delete_producto', 'view_producto', 'add_recetaingrediente', 'change_recetaingrediente', 'delete_recetaingrediente', 'view_recetaingrediente'],
        'ventas': ['add_mesa', 'change_mesa', 'delete_mesa', 'view_mesa', 'add_orden', 'change_orden', 'delete_orden', 'view_orden', 'add_itemorden', 'change_itemorden', 'delete_itemorden', 'view_itemorden', 'add_ticket', 'change_ticket', 'delete_ticket', 'view_ticket'],
        'inventario': ['add_proveedor', 'change_proveedor', 'delete_proveedor', 'view_proveedor', 'add_entradainventario', 'change_entradainventario', 'delete_entradainventario', 'view_entradainventario', 'add_salidainventario', 'change_salidainventario', 'delete_salidainventario', 'view_salidainventario'],
        'reportes': ['add_reporteventadiaria', 'change_reporteventadiaria', 'delete_reporteventadiaria', 'view_reporteventadiaria'],
    },
    'cajero': {
        'cocina': ['view_categoria', 'view_producto'],
        'ventas': ['add_orden', 'change_orden', 'view_orden', 'add_ticket', 'view_ticket', 'view_mesa', 'view_itemorden'],
        'reportes': ['view_reporteventadiaria'],
    },
    'mesero': {
        'cocina': ['view_categoria', 'view_producto'],
        'ventas': ['add_orden', 'change_orden', 'view_orden', 'view_mesa', 'view_itemorden'],
    },
    'cocina': {
        'ventas': ['view_orden', 'change_orden', 'view_mesa', 'view_itemorden'],
    },
}


class Command(BaseCommand):
    help = 'Crea y configura los grupos de permisos del ERP.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--crear-usuarios-prueba',
            action='store_true',
            help='Crea cuentas no privilegiadas de prueba para cada rol.',
        )

    def handle(self, *args, **options):
        for group_name, app_permissions in ROLE_PERMISSIONS.items():
            group, created = Group.objects.get_or_create(name=group_name)
            permissions = Permission.objects.filter(
                content_type__app_label__in=[app for app in app_permissions.keys()],
                codename__in=[codename for codename_list in app_permissions.values() for codename in codename_list],
            )
            group.permissions.set(permissions)
            self.stdout.write(
                self.style.SUCCESS(f"Grupo '{group_name}' listo. Creado={created} | permisos={permissions.count()}")
            )

        for employee in Empleado.objects.select_related('usuario').filter(usuario__isnull=False):
            sincronizar_grupos_rol(employee)

        if options['crear_usuarios_prueba']:
            group_to_role = {'dueño': 'admin', 'cajero': 'cajero', 'mesero': 'mesero', 'cocina': 'taquero'}
            for group_name, role in group_to_role.items():
                username = f'test_{group_name}'
                user, _ = User.objects.get_or_create(
                    username=username,
                    defaults={'email': f'{username}@example.invalid', 'is_active': True},
                )
                user.is_staff = group_name == 'dueño'
                user.is_superuser = False
                user.set_unusable_password()
                user.save(update_fields=['is_staff', 'is_superuser', 'password'])
                group = Group.objects.get(name=group_name)
                user.groups.set([group])
                Empleado.objects.update_or_create(
                    usuario=user,
                    defaults={
                        'nombre': f'Test {group_name}',
                        'apellido': 'Account',
                        'rol': role,
                        'activo': True,
                    },
                )
                self.stdout.write(self.style.WARNING(f'Cuenta de prueba creada/actualizada: {username} (rol={group_name})'))
