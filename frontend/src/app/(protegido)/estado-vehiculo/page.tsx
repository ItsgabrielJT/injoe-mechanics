"use client";

import dynamic from "next/dynamic";

const EstadoVehiculoPage = dynamic(
  () =>
    import("@/modules/estado-vehiculo/presentation/pages/estado-vehiculo-page").then(
      (modulo) => modulo.EstadoVehiculoPage,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Cargando estado de vehículo…
      </div>
    ),
  },
);

export default function Page() {
  return <EstadoVehiculoPage />;
}
