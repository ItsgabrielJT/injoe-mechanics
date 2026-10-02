import { httpClient } from "@/shared/infrastructure/http/http-client";
import type {
  CategoriaServicio,
  Servicio,
  ServicioInput,
  TipoImpuesto,
} from "@/modules/servicios/domain/entities";

interface ServicioApiDto {
  id: number;
  empresa_id: number;
  punto_emision_id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: CategoriaServicio | null;
  precio_venta: number | string;
  aplica_iva: boolean;
  tipo_impuesto: TipoImpuesto;
  peso: number | string | null;
  activo: boolean;
}

interface ListaApi<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface DataApi<T> {
  data: T;
  message: string;
}

export interface ListaServicios {
  data: Servicio[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

function aNumero(valor: number | string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }
  const numero = Number(valor);
  return Number.isNaN(numero) ? null : numero;
}

function mapServicio(dto: ServicioApiDto): Servicio {
  return {
    id: dto.id,
    empresaId: dto.empresa_id,
    puntoEmisionId: dto.punto_emision_id,
    codigo: dto.codigo,
    nombre: dto.nombre,
    descripcion: dto.descripcion,
    categoria: dto.categoria,
    precioVenta: aNumero(dto.precio_venta) ?? 0,
    aplicaIva: dto.aplica_iva,
    tipoImpuesto: dto.tipo_impuesto,
    peso: aNumero(dto.peso),
    activo: dto.activo,
  };
}

export async function listarServicios(
  token: string,
  params: { page: number; size: number; search?: string; categoria?: CategoriaServicio; activo?: boolean },
): Promise<ListaServicios> {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  });
  if (params.search) {
    query.set("search", params.search);
  }
  if (params.categoria) {
    query.set("categoria", params.categoria);
  }
  if (params.activo !== undefined) {
    query.set("activo", String(params.activo));
  }
  const dto = await httpClient<ListaApi<ServicioApiDto>>(`/servicios/?${query.toString()}`, { token });
  return {
    data: dto.data.map(mapServicio),
    total: dto.total,
    page: dto.page,
    size: dto.size,
    pages: dto.pages,
  };
}

export async function crearServicio(token: string, body: ServicioInput): Promise<Servicio> {
  const dto = await httpClient<DataApi<ServicioApiDto>>("/servicios/", { method: "POST", token, body });
  return mapServicio(dto.data);
}

export async function actualizarServicio(token: string, id: number, body: ServicioInput): Promise<Servicio> {
  const dto = await httpClient<DataApi<ServicioApiDto>>(`/servicios/${id}`, { method: "PUT", token, body });
  return mapServicio(dto.data);
}

export async function eliminarServicio(token: string, id: number): Promise<void> {
  await httpClient<void>(`/servicios/${id}`, { method: "DELETE", token });
}
