"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Empresa, PuntoEmision, Sesion } from "@/modules/acceso/domain/entities";
import {
  cambiarPunto as cambiarPuntoApi,
  iniciarSesion as iniciarSesionApi,
  seleccionarContexto as seleccionarContextoApi,
} from "@/modules/acceso/infrastructure/auth-api";

const STORAGE_KEY = "mecanicos.sesion";

function leerSesion(): Sesion | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as Sesion;
  } catch {
    return null;
  }
}

function guardarSesion(sesion: Sesion) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
}

function mezclarTokens(previa: Sesion | null, siguiente: Sesion): Sesion {
  return {
    ...siguiente,
    accessToken: siguiente.accessToken ?? previa?.accessToken ?? null,
    refreshToken: siguiente.refreshToken ?? previa?.refreshToken ?? null,
  };
}

export function useSesion() {
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    setSesion(leerSesion());
    setListo(true);
  }, []);

  const persistir = useCallback((siguiente: Sesion) => {
    const actual = mezclarTokens(leerSesion(), siguiente);
    guardarSesion(actual);
    setSesion(actual);
    return actual;
  }, []);

  const login = useCallback(
    async (identificador: string, contrasena: string) => {
      setCargando(true);
      try {
        const resultado = await iniciarSesionApi(identificador, contrasena);
        persistir(resultado);
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
        const resultado = await seleccionarContextoApi(puntoEmisionId, actual.accessToken);
        persistir(resultado);
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
        const resultado = await cambiarPuntoApi(puntoEmisionId, actual.accessToken);
        persistir(resultado);
        return resultado;
      } finally {
        setCargando(false);
      }
    },
    [persistir],
  );

  const cerrar = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSesion(null);
    router.push("/login");
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
