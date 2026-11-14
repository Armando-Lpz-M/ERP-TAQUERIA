import { Outlet, useLocation } from 'react-router'

import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { NAV_ITEMS } from '@/lib/navigation'

function usePaginaActual() {
  const { pathname } = useLocation()
  return NAV_ITEMS.find((item) => (item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)))
}

export function AppLayout() {
  const pagina = usePaginaActual()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-[env(safe-area-inset-top,0px)] z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" aria-label="Mostrar u ocultar menú" />
          <Separator orientation="vertical" className="mx-1 h-5 data-vertical:self-center" />
          <h1 className="font-display text-2xl tracking-widest">{pagina?.title ?? 'Taquería ERP'}</h1>
        </header>
        <div className="flex-1 p-4 sm:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
