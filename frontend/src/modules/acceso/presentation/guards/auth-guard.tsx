"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";
import { renovarSiHaceFalta } from "@/modules/acceso/infrastructure/renovar-sesion";
import { limpiarSesion, sesionOperativa, tokenExpirado } from "@/modules/acceso/infrastructure/sesion-storage";

const RUTAS_PUBLICAS = new Set(["/login"]);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { sesion, listo, cerrar } = useSesionContext();
  const esPublica = RUTAS_PUBLICAS.has(pathname);
  const operativa = sesionOperativa(sesion);

  useEffect(() => {
    if (!listo) {
      return;
    }

    if (!operativa) {
      if (sesion) {
        limpiarSesion();
      }
      if (!esPublica) {
        cerrar();
      }
      return;
    }

    if (sesion?.accessToken && tokenExpirado(sesion.accessToken)) {
      void renovarSiHaceFalta();
    }

    if (esPublica) {
      if (sesion?.requiereSeleccion || !sesion?.puntoEmisionId) {
        router.replace("/seleccionar-punto");
        return;
      }
      router.replace("/dashboard");
      return;
    }

    if (pathname !== "/seleccionar-punto" && (sesion?.requiereSeleccion || !sesion?.puntoEmisionId)) {
      router.replace("/seleccionar-punto");
    }
  }, [cerrar, esPublica, listo, operativa, pathname, router, sesion]);

  if (!listo && !esPublica) {
    return null;
  }

  if (!esPublica && !operativa) {
    return null;
  }

  return <>{children}</>;
}
