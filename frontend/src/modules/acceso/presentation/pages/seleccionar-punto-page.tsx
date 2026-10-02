"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SelectorPuntoEmision } from "@/modules/acceso/presentation/components/selector-punto-emision";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";

export function SeleccionarPuntoPage() {
  const router = useRouter();
  const { sesion, listo, seleccionarPunto, cargando } = useSesionContext();

  useEffect(() => {
    if (!listo) {
      return;
    }
    if (!sesion) {
      router.replace("/login");
      return;
    }
    const puntos = sesion.empresas.flatMap((empresa) => empresa.puntosEmision);
    if (puntos.length === 1 && sesion.requiereSeleccion) {
      void seleccionarPunto(puntos[0].id);
    }
  }, [listo, router, seleccionarPunto, sesion]);

  if (!sesion) {
    return null;
  }

  return (
    <SelectorPuntoEmision
      empresas={sesion.empresas}
      cargando={cargando}
      onSelect={(punto) => {
        void seleccionarPunto(punto.id);
      }}
    />
  );
}
