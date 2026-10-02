"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";
import { AppShell } from "@/shared/components/layout/app-shell";

export default function ProtegidoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { sesion, listo } = useSesionContext();

  useEffect(() => {
    if (!listo) {
      return;
    }
    if (!sesion?.accessToken && !sesion?.refreshToken) {
      router.replace("/login");
      return;
    }
    if (sesion.requiereSeleccion || !sesion.puntoEmisionId) {
      router.replace("/seleccionar-punto");
    }
  }, [listo, router, sesion]);

  if (!listo || !sesion || sesion.requiereSeleccion || !sesion.puntoEmisionId) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
