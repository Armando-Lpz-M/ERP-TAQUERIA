from .setup_roles import Command as SetupRolesCommand


class Command(SetupRolesCommand):
    help = 'Crea o sincroniza de forma repetible los grupos y roles del ERP.'
