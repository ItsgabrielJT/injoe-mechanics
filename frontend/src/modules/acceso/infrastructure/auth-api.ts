import { httpClient } from "@/shared/infrastructure/http/http-client";
import type { Sesion } from "@/modules/acceso/domain/entities";
import { mapSesion, type SesionApiDto } from "@/modules/acceso/infrastructure/sesion-mapper";

export async function iniciarSesion(identificador: string, contrasena: string): Promise<Sesion> {
  const dto = await httpClient<SesionApiDto>("/auth/login", {
    method: "POST",
    body: { identificador, contrasena },
    sinAuth: true,
  });
  return mapSesion(dto);
}

export async function seleccionarContexto(puntoEmisionId: number, token: string): Promise<Sesion> {
  const dto = await httpClient<SesionApiDto>("/auth/seleccionar-contexto", {
    method: "POST",
    token,
    body: { punto_emision_id: puntoEmisionId },
  });
  return mapSesion(dto);
}

export async function cambiarPunto(puntoEmisionId: number, token: string): Promise<Sesion> {
  const dto = await httpClient<SesionApiDto>("/auth/cambiar-punto", {
    method: "POST",
    token,
    body: { punto_emision_id: puntoEmisionId },
  });
  return mapSesion(dto);
}

export async function obtenerMe(token: string): Promise<Sesion> {
  const dto = await httpClient<SesionApiDto>("/auth/me", { token });
  return mapSesion(dto);
}

export async function refrescarSesionApi(refreshToken: string): Promise<Sesion> {
  const dto = await httpClient<SesionApiDto>("/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
    sinAuth: true,
  });
  return mapSesion(dto);
}
