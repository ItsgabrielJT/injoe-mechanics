import { httpClient } from "@/shared/infrastructure/http/http-client";
import type { PrecioProveedor, Proveedor, ProveedorInput, TipoPersona } from "@/modules/proveedores/domain/entities";

interface ListaApi<T> {
  data: T[];
  total: number;
  page?: number;
  size?: number;
  pages?: number;
}

interface DataApi<T> {
  data: T;
  message: string;
}

interface ProveedorDto {
  id: number;
  identificacion: string;
  nombres: string;
  tipo_persona: TipoPersona;
  razon_social: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  direccion_fiscal: string | null;
  telefono_fiscal: string | null;
  correo_fiscal: string | null;
  notas: string | null;
  activo: boolean;
}

interface PrecioDto {
  id: number;
  proveedor_id: number;
  precio_compra: number | string;
  es_principal: boolean;
  proveedor_nombres: string | null;
  proveedor_identificacion: string | null;
  producto_id: number | null;
  servicio_id: number | null;
}

export interface ListaProveedores {
  data: Proveedor[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

function mapProveedor(dto: ProveedorDto): Proveedor {
  return {
    id: dto.id,
    identificacion: dto.identificacion,
    nombres: dto.nombres,
    tipoPersona: dto.tipo_persona,
    razonSocial: dto.razon_social,
    direccion: dto.direccion,
    telefono: dto.telefono,
    correo: dto.correo,
    direccionFiscal: dto.direccion_fiscal,
    telefonoFiscal: dto.telefono_fiscal,
    correoFiscal: dto.correo_fiscal,
    notas: dto.notas,
    activo: dto.activo,
  };
}

function mapPrecio(dto: PrecioDto): PrecioProveedor {
  return {
    id: dto.id,
    proveedorId: dto.proveedor_id,
    precioCompra: Number(dto.precio_compra),
    esPrincipal: dto.es_principal,
    proveedorNombres: dto.proveedor_nombres,
    proveedorIdentificacion: dto.proveedor_identificacion,
    productoId: dto.producto_id,
    servicioId: dto.servicio_id,
  };
}

export async function listarProveedores(
  token: string,
  params: { page: number; size: number; search?: string; activo?: boolean },
): Promise<ListaProveedores> {
  const query = new URLSearchParams({ page: String(params.page), size: String(params.size) });
  if (params.search) query.set("search", params.search);
  if (params.activo !== undefined) query.set("activo", String(params.activo));
  const respuesta = await httpClient<ListaApi<ProveedorDto>>(`/proveedores/?${query}`, { token });
  return {
    data: respuesta.data.map(mapProveedor),
    total: respuesta.total,
    page: respuesta.page ?? params.page,
    size: respuesta.size ?? params.size,
    pages: respuesta.pages ?? 1,
  };
}

export async function crearProveedor(token: string, body: ProveedorInput): Promise<Proveedor> {
  const respuesta = await httpClient<DataApi<ProveedorDto>>("/proveedores/", { method: "POST", token, body });
  return mapProveedor(respuesta.data);
}

export async function actualizarProveedor(token: string, id: number, body: ProveedorInput): Promise<Proveedor> {
  const respuesta = await httpClient<DataApi<ProveedorDto>>(`/proveedores/${id}`, { method: "PUT", token, body });
  return mapProveedor(respuesta.data);
}

export async function eliminarProveedor(token: string, id: number): Promise<void> {
  await httpClient(`/proveedores/${id}`, { method: "DELETE", token });
}

export async function listarPreciosProducto(token: string, productoId: number): Promise<PrecioProveedor[]> {
  const respuesta = await httpClient<ListaApi<PrecioDto>>(`/productos/${productoId}/proveedores`, { token });
  return respuesta.data.map(mapPrecio);
}

export async function listarPreciosServicio(token: string, servicioId: number): Promise<PrecioProveedor[]> {
  const respuesta = await httpClient<ListaApi<PrecioDto>>(`/servicios/${servicioId}/proveedores`, { token });
  return respuesta.data.map(mapPrecio);
}

export async function guardarPrecioProducto(
  token: string,
  productoId: number,
  body: { proveedor_id: number; precio_compra: number; es_principal?: boolean },
  relacionId?: number,
): Promise<PrecioProveedor> {
  const path = relacionId
    ? `/productos/${productoId}/proveedores/${relacionId}`
    : `/productos/${productoId}/proveedores`;
  const respuesta = await httpClient<DataApi<PrecioDto>>(path, {
    method: relacionId ? "PUT" : "POST",
    token,
    body,
  });
  return mapPrecio(respuesta.data);
}

export async function guardarPrecioServicio(
  token: string,
  servicioId: number,
  body: { proveedor_id: number; precio_compra: number; es_principal?: boolean },
  relacionId?: number,
): Promise<PrecioProveedor> {
  const path = relacionId
    ? `/servicios/${servicioId}/proveedores/${relacionId}`
    : `/servicios/${servicioId}/proveedores`;
  const respuesta = await httpClient<DataApi<PrecioDto>>(path, {
    method: relacionId ? "PUT" : "POST",
    token,
    body,
  });
  return mapPrecio(respuesta.data);
}

export async function eliminarPrecioProducto(token: string, productoId: number, relacionId: number): Promise<void> {
  await httpClient(`/productos/${productoId}/proveedores/${relacionId}`, { method: "DELETE", token });
}

export async function eliminarPrecioServicio(token: string, servicioId: number, relacionId: number): Promise<void> {
  await httpClient(`/servicios/${servicioId}/proveedores/${relacionId}`, { method: "DELETE", token });
}
