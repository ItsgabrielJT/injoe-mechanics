"use client";

import dynamic from "next/dynamic";

const FacturacionPage = dynamic(
  () =>
    import("@/modules/facturacion/presentation/pages/facturacion-page").then(
      (modulo) => modulo.FacturacionPage,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Cargando facturación…
      </div>
    ),
  },
);

export default function Page() {
  return <FacturacionPage />;
}
