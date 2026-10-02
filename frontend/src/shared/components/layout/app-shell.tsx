"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, Briefcase, LayoutDashboard, Menu, Package, Users, X } from "lucide-react";
import { SwitcherPunto } from "@/modules/acceso/presentation/components/switcher-punto";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/servicios", label: "Servicios", icon: Briefcase },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
];

function SidebarContent({
  pathname,
  onNavigate,
  onCerrar,
  onCerrarMenu,
}: {
  pathname: string;
  onNavigate?: () => void;
  onCerrar: () => void;
  onCerrarMenu?: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 px-2 py-4 border-b border-border/50">
        <img src="/logos/logo_injoe_web.png" alt="INJOE" className="h-10 w-10 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-primary">INJOE</p>
          <p className="text-sm text-muted-foreground">Mecánicos</p>
        </div>
        {onCerrarMenu && (
          <Button variant="ghost" size="icon" className="shrink-0" onClick={onCerrarMenu} aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      <div className="py-4 border-b border-border/50">
        <SwitcherPunto />
      </div>
      <nav className="py-4 space-y-1">
        {NAV.map((item) => {
          const activo = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                activo ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground hover:bg-primary/10",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <Button variant="ghost" className="w-full justify-start text-foreground" onClick={onCerrar}>
          Cerrar sesión
        </Button>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { cerrar } = useSesionContext();
  const [menuAbierto, setMenuAbierto] = useState(false);

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
      <aside className="hidden lg:flex w-72 xl:w-80 shrink-0 border-r border-sidebar-border bg-sidebar p-4 flex-col">
        <SidebarContent pathname={pathname} onCerrar={cerrar} />
      </aside>

      {menuAbierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuAbierto(false)} />
          <aside className="relative h-full w-[min(20rem,86vw)] bg-sidebar p-4 flex flex-col shadow-elegant">
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
          <img src="/logos/logo_injoe_web.png" alt="INJOE" className="h-8 w-8 object-contain" />
          <div className="min-w-0">
            <p className="font-semibold text-primary leading-tight">INJOE</p>
            <p className="text-xs text-muted-foreground truncate">Mecánicos</p>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
