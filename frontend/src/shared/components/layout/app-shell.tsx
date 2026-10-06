"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Briefcase,
  Car,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Truck,
  Users,
  X,
} from "lucide-react";
import { SwitcherPunto } from "@/modules/acceso/presentation/components/switcher-punto";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";
import { BrandLockup } from "@/shared/components/brand-lockup";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/ordenes-trabajo", label: "Órdenes", icon: ClipboardList },
  { href: "/estado-vehiculo", label: "Estado de vehículo", icon: Car },
  { href: "/servicios", label: "Servicios", icon: Briefcase },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/proveedores", label: "Proveedores", icon: Truck },
  { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/facturacion", label: "Facturación", icon: FileText },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

function SidebarContent({
  pathname,
  onNavigate,
  onCerrar,
  onCerrarMenu,
  onPuntoAbiertoChange,
}: {
  pathname: string;
  onNavigate?: () => void;
  onCerrar: () => void;
  onCerrarMenu?: () => void;
  onPuntoAbiertoChange?: (abierto: boolean) => void;
}) {
  return (
    <>
      <div className="sidebar-center flex items-center gap-3 px-2 py-4 border-b border-border/50">
        <BrandLockup size="sm" className="sidebar-center min-w-0 flex-1" nameClassName="sidebar-label" />
        {onCerrarMenu && (
          <Button variant="ghost" size="icon" className="sidebar-label shrink-0" onClick={onCerrarMenu} aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      <div className="py-4 border-b border-border/50">
        <SwitcherPunto onAbiertoChange={onPuntoAbiertoChange} />
      </div>
      <nav className="py-4 space-y-1">
        {NAV.map((item) => {
          const activo = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              onClick={onNavigate}
              className={cn(
                "sidebar-center flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                activo ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground hover:bg-primary/10",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="sidebar-label min-w-0 truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <Button variant="ghost" className="sidebar-center w-full justify-start gap-3 text-foreground" onClick={onCerrar}>
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="sidebar-label">Cerrar sesión</span>
        </Button>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { cerrar } = useSesionContext();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [puntoAbierto, setPuntoAbierto] = useState(false);

  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuAbierto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuAbierto]);

  return (
    <div className="min-h-dvh bg-background flex overflow-x-hidden">
      <div
        className="hidden w-60 shrink-0 lg:block [@media(hover:hover)_and_(pointer:fine)]:w-16"
        aria-hidden
      />
      <aside className="sidebar-desktop" data-expanded={puntoAbierto ? "true" : undefined}>
        <SidebarContent pathname={pathname} onCerrar={cerrar} onPuntoAbiertoChange={setPuntoAbierto} />
      </aside>

      {menuAbierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuAbierto(false)} />
          <aside className="relative h-full w-[min(20rem,86vw)] bg-sidebar p-4 flex flex-col overflow-y-auto shadow-elegant">
            <SidebarContent
              pathname={pathname}
              onNavigate={() => setMenuAbierto(false)}
              onCerrar={cerrar}
              onCerrarMenu={() => setMenuAbierto(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b bg-card/95 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </Button>
          <BrandLockup size="sm" className="min-w-0" />
        </header>
        <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
