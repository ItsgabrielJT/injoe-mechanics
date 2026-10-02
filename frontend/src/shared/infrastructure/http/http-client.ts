import { env } from "@/config/env";
import { ApiError } from "@/shared/infrastructure/http/http-error";
import { asegurarAccessToken, renovarSesion } from "@/modules/acceso/infrastructure/renovar-sesion";
import { forzarCierreSesion } from "@/modules/acceso/infrastructure/sesion-storage";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface HttpOptions {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
  sinAuth?: boolean;
}

const RUTAS_PUBLICAS = new Set(["/auth/login", "/auth/refresh"]);

function esRutaPublica(path: string): boolean {
  return RUTAS_PUBLICAS.has(path.split("?")[0] ?? path);
}

async function ejecutar<T>(path: string, options: HttpOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    return await fetch(`${env.apiUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Error de conexión. Por favor, verifica tu conexión a internet");
  }
}

async function parsear<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detalle = typeof data.detail === "string"
      ? data.detail
      : Array.isArray(data.detail)
        ? data.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join("; ") || "No se pudo completar la solicitud"
        : "No se pudo completar la solicitud";
    throw new ApiError(response.status, detalle);
  }
  return data as T;
}

export async function httpClient<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const publica = options.sinAuth || esRutaPublica(path);
  let token = publica ? (options.token ?? null) : await asegurarAccessToken(options.token);

  let response = await ejecutar(path, options, token);

  if (response.status === 401 && !publica) {
    try {
      const renovada = await renovarSesion();
      token = renovada.accessToken;
      response = await ejecutar(path, options, token);
    } catch {
      forzarCierreSesion();
      throw new ApiError(401, "Sesión expirada");
    }
  }

  if (response.status === 401 && !publica) {
    forzarCierreSesion();
    throw new ApiError(401, "Sesión expirada");
  }

  return parsear<T>(response);
}
