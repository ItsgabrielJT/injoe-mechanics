"use client";

import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";

export function DashboardPage() {
  const { sesion, empresaActiva, puntoActivo } = useSesionContext();

  if (!sesion || !empresaActiva || !puntoActivo) {
    return null;
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Panel de trabajo</h1>
      <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
        Bienvenido, {sesion.usuario.nombreCompleto}. Estás operando en un contexto de punto de emisión.
      </p>
      <div className="grid gap-4 md:grid-cols-2 max-w-3xl">
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-soft">
          <p className="text-sm text-muted-foreground">Empresa</p>
          <p className="text-lg sm:text-xl font-semibold break-words">{empresaActiva.nombre}</p>
          <p className="text-sm text-muted-foreground mt-1">RUC {empresaActiva.ruc}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-soft">
          <p className="text-sm text-muted-foreground">Punto de emisión</p>
          <p className="text-lg sm:text-xl font-semibold break-words">{puntoActivo.nombre}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Código {puntoActivo.codigo} · {puntoActivo.direccion}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-soft md:col-span-2">
          <p className="text-sm text-muted-foreground">Roles</p>
          <p className="text-lg font-medium">{sesion.usuario.roles.join(", ")}</p>
        </div>
      </div>
    </div>
  );
}
