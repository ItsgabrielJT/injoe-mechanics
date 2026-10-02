"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Empresa, PuntoEmision, Sesion } from "@/modules/acceso/domain/entities";
import {
  cambiarPunto as cambiarPuntoApi,
  iniciarSesion as iniciarSesionApi,
  seleccionarContexto as seleccionarContextoApi,
} from "@/modules/acceso/infrastructure/auth-api";
import { renovarSiHaceFalta } from "@/modules/acceso/infrastructure/renovar-sesion";
import {
  accessPorExpirar,
  leerSesion,
  limpiarSesion,
  persistirSesion,
  sesionOperativa,
  suscribirSesion,
} from "@/modules/acceso/infrastructure/sesion-storage";

export function useSesion() {
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const actual = leerSesion();
    setSesion(actual);
    setListo(true);
    return suscribirSesion(setSesion);
  }, []);

  useEffect(() => {
    if (!listo) {
      return;
    }

    let cancelado = false;

    const intentarRenovar = async () => {
      const actual = leerSesion();
      if (!actual || !sesionOperativa(actual) || !accessPorExpirar(actual)) {
        return;
      }
      const renovada = await renovarSiHaceFalta();
      if (!cancelado && renovada) {
        setSesion(renovada);
      }
    };

    void intentarRenovar();
    const intervalo = window.setInterval(() => {
      void intentarRenovar();
    }, 60_000);

    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
    };
  }, [listo]);

  const persistir = useCallback((siguiente: Sesion) => persistirSesion(siguiente), []);

  const login = useCallback(
    async (identificador: string, contrasena: string) => {
      setCargando(true);
      try {
        const resultado = persistir(await iniciarSesionApi(identificador, contrasena));
        if (resultado.requiereSeleccion) {
          router.push("/seleccionar-punto");
        } else {
          router.push("/dashboard");
        }
        return resultado;
      } finally {
        setCargando(false);
      }
    },
    [persistir, router],
  );

  const seleccionarPunto = useCallback(
    async (puntoEmisionId: number) => {
      const actual = leerSesion();
      if (!actual?.accessToken) {
        throw new Error("Sesión no encontrada");
      }
      setCargando(true);
      try {
        const resultado = persistir(await seleccionarContextoApi(puntoEmisionId, actual.accessToken));
        router.push("/dashboard");
        return resultado;
      } finally {
        setCargando(false);
      }
    },
    [persistir, router],
  );

  const cambiarPunto = useCallback(
    async (puntoEmisionId: number) => {
      const actual = leerSesion();
      if (!actual?.accessToken) {
        throw new Error("Sesión no encontrada");
      }
      setCargando(true);
      try {
        return persistir(await cambiarPuntoApi(puntoEmisionId, actual.accessToken));
      } finally {
        setCargando(false);
      }
    },
    [persistir],
  );

  const cerrar = useCallback(() => {
    limpiarSesion();
    router.replace("/login");
  }, [router]);

  const empresaActiva = useMemo<Empresa | null>(() => {
    if (!sesion?.empresaId) {
      return null;
    }
    return sesion.empresas.find((empresa) => empresa.id === sesion.empresaId) ?? null;
  }, [sesion]);

  const puntoActivo = useMemo<PuntoEmision | null>(() => {
    if (!sesion?.puntoEmisionId || !empresaActiva) {
      return null;
    }
    return empresaActiva.puntosEmision.find((punto) => punto.id === sesion.puntoEmisionId) ?? null;
  }, [empresaActiva, sesion]);

  return {
    sesion,
    empresaActiva,
    puntoActivo,
    cargando,
    listo,
    login,
    seleccionarPunto,
    cambiarPunto,
    cerrar,
  };
}
