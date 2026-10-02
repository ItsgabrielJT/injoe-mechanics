"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SwitcherPunto } from "@/modules/acceso/presentation/components/switcher-punto";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";
import { Button } from "@/shared/components/ui/button";

export function DashboardPage() {
  const router = useRouter();
  const { sesion, empresaActiva, puntoActivo, listo, cerrar } = useSesionContext();

  useEffect(() => {
    if (!listo) {
      return;
    }
    if (!sesion) {
      router.replace("/login");
      return;
    }
    if (sesion.requiereSeleccion || !sesion.puntoEmisionId) {
      router.replace("/seleccionar-punto");
    }
  }, [listo, router, sesion]);

  if (!sesion || !empresaActiva || !puntoActivo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-80 border-r border-sidebar-border bg-sidebar p-4 flex flex-col">
        <div className="flex items-center gap-3 px-2 py-4 border-b border-border/50">
          <img src="/logos/logo_injoe_web.png" alt="INJOE" className="h-10 w-10 object-contain" />
          <div>
            <p className="font-semibold text-primary">INJOE</p>
            <p className="text-sm text-muted-foreground">Mecánicos</p>
          </div>
        </div>
        <div className="py-4 border-b border-border/50">
          <SwitcherPunto />
        </div>
        <div className="mt-auto">
          <Button variant="ghost" className="w-full justify-start text-foreground" onClick={cerrar}>
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-2">Panel de trabajo</h1>
        <p className="text-muted-foreground mb-8">
          Bienvenido, {sesion.usuario.nombreCompleto}. Estás operando en un contexto de punto de emisión.
        </p>
        <div className="grid gap-4 md:grid-cols-2 max-w-3xl">
          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <p className="text-sm text-muted-foreground">Empresa</p>
            <p className="text-xl font-semibold">{empresaActiva.nombre}</p>
            <p className="text-sm text-muted-foreground mt-1">RUC {empresaActiva.ruc}</p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <p className="text-sm text-muted-foreground">Punto de emisión</p>
            <p className="text-xl font-semibold">{puntoActivo.nombre}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Código {puntoActivo.codigo} · {puntoActivo.direccion}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-soft md:col-span-2">
            <p className="text-sm text-muted-foreground">Roles</p>
            <p className="text-lg font-medium">{sesion.usuario.roles.join(", ")}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
