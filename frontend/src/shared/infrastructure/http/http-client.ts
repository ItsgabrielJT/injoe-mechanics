import { env } from "@/config/env";
import { ApiError } from "@/shared/infrastructure/http/http-error";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface HttpOptions {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
}

export async function httpClient<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Error de conexión. Por favor, verifica tu conexión a internet");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detalle = typeof data.detail === "string" ? data.detail : "No se pudo completar la solicitud";
    throw new ApiError(response.status, detalle);
  }
  return data as T;
}
