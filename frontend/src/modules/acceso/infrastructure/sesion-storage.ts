import type { Sesion } from "@/modules/acceso/domain/entities";

export const STORAGE_KEY = "mecanicos.sesion";
export const AUTH_COOKIE = "mecanicos.auth";
export const REFRESH_HORAS = 24;

type SesionListener = (sesion: Sesion | null) => void;

const listeners = new Set<SesionListener>();

export function suscribirSesion(listener: SesionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notificar(sesion: Sesion | null) {
  listeners.forEach((listener) => listener(sesion));
}

function leerExpJwt(token: string | null | undefined): number | null {
  if (!token) {
    return null;
  }
  try {
    const partes = token.split(".");
    if (partes.length < 2) {
      return null;
    }
    const payload = JSON.parse(atob(partes[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: number;
    };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function tokenExpirado(token: string | null | undefined, margenMs = 0): boolean {
  const expiraEn = leerExpJwt(token);
  if (expiraEn === null) {
    return true;
  }
  return Date.now() + margenMs >= expiraEn;
}

export function accessPorExpirar(sesion: Sesion | null, minutos = 5): boolean {
  if (!sesion?.accessToken) {
    return true;
  }
  return tokenExpirado(sesion.accessToken, minutos * 60 * 1000);
}

function marcarCookie(horas = REFRESH_HORAS) {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${AUTH_COOKIE}=1; Path=/; Max-Age=${horas * 3600}; SameSite=Lax`;
}

function borrarCookie() {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function leerSesion(): Sesion | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const sesion = JSON.parse(raw) as Sesion;
    if (sesionOperativa(sesion)) {
      marcarCookie();
    }
    return sesion;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion: Sesion) {
  const actual: Sesion = {
    ...sesion,
    accessTokenCreadoEn: sesion.accessToken ? Date.now() : (sesion.accessTokenCreadoEn ?? null),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actual));
  if (actual.accessToken || actual.refreshToken) {
    marcarCookie();
  } else {
    borrarCookie();
  }
  notificar(actual);
  return actual;
}

export function mezclarTokens(previa: Sesion | null, siguiente: Sesion): Sesion {
  return {
    ...siguiente,
    accessToken: siguiente.accessToken ?? previa?.accessToken ?? null,
    refreshToken: siguiente.refreshToken ?? previa?.refreshToken ?? null,
    expiraEn: siguiente.expiraEn ?? previa?.expiraEn ?? null,
    refreshExpiraEn: siguiente.refreshExpiraEn ?? previa?.refreshExpiraEn ?? null,
    accessTokenCreadoEn: siguiente.accessToken
      ? Date.now()
      : (siguiente.accessTokenCreadoEn ?? previa?.accessTokenCreadoEn ?? null),
  };
}

export function persistirSesion(siguiente: Sesion): Sesion {
  return guardarSesion(mezclarTokens(leerSesion(), siguiente));
}

export function limpiarSesion() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  borrarCookie();
  notificar(null);
}

export function forzarCierreSesion() {
  limpiarSesion();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.assign("/login");
  }
}

export function sesionOperativa(sesion: Sesion | null): boolean {
  if (!sesion) {
    return false;
  }
  if (sesion.accessToken && !tokenExpirado(sesion.accessToken)) {
    return true;
  }
  return Boolean(sesion.refreshToken && !tokenExpirado(sesion.refreshToken));
}
