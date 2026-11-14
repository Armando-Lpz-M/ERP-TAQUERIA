import { ChevronsUpDown, LogOut } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAuth } from '@/features/auth/auth-context'
import { ROL_LABEL, seccionesParaRol } from '@/lib/navigation'

export function AppSidebar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  const secciones = seccionesParaRol(user?.rol)
  const inicial = (user?.nombre || user?.username || '?').charAt(0).toUpperCase()

  const esActiva = (path: string) => (path === '/' ? pathname === '/' : pathname.startsWith(path))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/">
                <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-lg">
                  🌮
                </span>
                <span className="flex flex-col leading-none">
                  <span className="font-display text-xl tracking-widest text-primary">Taquería</span>
                  <span className="text-xs text-muted-foreground">ERP System</span>
                </span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {secciones.map((seccion) => (
          <SidebarGroup key={seccion.label}>
            <SidebarGroupLabel>{seccion.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {seccion.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={esActiva(item.path)} tooltip={item.title}>
                      <NavLink to={item.path} onClick={() => isMobile && setOpenMobile(false)}>
                        <item.icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary font-semibold text-primary-foreground">
                      {inicial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
                    <span className="truncate text-sm font-medium">{user?.nombre}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user ? ROL_LABEL[user.rol] : ''}
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side={isMobile ? 'top' : 'right'} align="end" className="min-w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span>{user?.nombre}</span>
                  <span className="text-xs font-normal text-muted-foreground">@{user?.username}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => void logout()}>
                  <LogOut />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
