import { env } from "@/config/env";
import { ApiError } from "@/shared/infrastructure/http/http-error";
import type { Sesion } from "@/modules/acceso/domain/entities";
import { mapSesion, type SesionApiDto } from "@/modules/acceso/infrastructure/sesion-mapper";
import {
  accessPorExpirar,
  forzarCierreSesion,
  leerSesion,
  persistirSesion,
  tokenExpirado,
} from "@/modules/acceso/infrastructure/sesion-storage";

let renovacionEnCurso: Promise<Sesion> | null = null;

async function solicitarRefresh(refreshToken: string): Promise<Sesion> {
  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    throw new ApiError(0, "Error de conexión. Por favor, verifica tu conexión a internet");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detalle = typeof data.detail === "string" ? data.detail : "Token inválido o expirado";
    throw new ApiError(response.status, detalle);
  }
  return persistirSesion(mapSesion(data as SesionApiDto));
}

export async function renovarSesion(): Promise<Sesion> {
  if (renovacionEnCurso) {
    return renovacionEnCurso;
  }

  renovacionEnCurso = (async () => {
    const actual = leerSesion();
    if (!actual?.refreshToken || tokenExpirado(actual.refreshToken)) {
      throw new ApiError(401, "Sesión expirada");
    }
    return solicitarRefresh(actual.refreshToken);
  })().finally(() => {
    renovacionEnCurso = null;
  });

  return renovacionEnCurso;
}

export async function asegurarAccessToken(tokenExplicit?: string | null): Promise<string | null> {
  const actual = leerSesion();
  const token = tokenExplicit ?? actual?.accessToken ?? null;

  if (token && !tokenExpirado(token)) {
    return token;
  }

  if (!actual?.refreshToken || tokenExpirado(actual.refreshToken)) {
    return token;
  }

  try {
    const renovada = await renovarSesion();
    return renovada.accessToken;
  } catch {
    return token;
  }
}

export async function renovarSiHaceFalta(): Promise<Sesion | null> {
  const actual = leerSesion();
  if (!actual) {
    return null;
  }
  if (!accessPorExpirar(actual) && actual.accessToken && !tokenExpirado(actual.accessToken)) {
    return actual;
  }
  if (!actual.refreshToken || tokenExpirado(actual.refreshToken)) {
    forzarCierreSesion();
    return null;
  }
  try {
    return await renovarSesion();
  } catch {
    forzarCierreSesion();
    return null;
  }
}
