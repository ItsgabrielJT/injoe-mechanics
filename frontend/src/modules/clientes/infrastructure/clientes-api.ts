import { httpClient } from "@/shared/infrastructure/http/http-client";
import type { Cliente, ClienteInput, Vehiculo, VehiculoInput } from "@/modules/clientes/domain/entities";

interface ClienteApiDto {
  id: number;
  empresa_id: number;
  punto_emision_id: number;
  identificacion: string | null;
  tipo_cliente: Cliente["tipoCliente"];
  nombres: string;
  razon_social: string | null;
  fecha_nacimiento: string | null;
  provincia: string | null;
  canton: string | null;
  parroquia: string | null;
  direcciones: string[];
  telefonos: string[];
  correos: string[];
  indice_direccion_principal: number | null;
  indice_telefono_principal: number | null;
  indice_correo_principal: number | null;
  direccion_fiscal: string | null;
  telefono_fiscal: string | null;
  correo_fiscal: string | null;
  notas: string | null;
  activo: boolean;
  total_vehiculos: number;
  placas: string[];
  correo_principal: string | null;
}

interface VehiculoApiDto {
  id: number;
  empresa_id: number;
  punto_emision_id: number;
  cliente_id: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  tipo: Vehiculo["tipo"];
  color: string | null;
  combustible: Vehiculo["combustible"];
  cilindrada: number | null;
  transmision: Vehiculo["transmision"];
  notas: string | null;
  activo: boolean;
  cliente_nombres?: string | null;
  cliente_identificacion?: string | null;
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

export interface ListaClientes {
  data: Cliente[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

function mapCliente(dto: ClienteApiDto): Cliente {
  return {
    id: dto.id,
    empresaId: dto.empresa_id,
    puntoEmisionId: dto.punto_emision_id,
    identificacion: dto.identificacion,
    tipoCliente: dto.tipo_cliente,
    nombres: dto.nombres,
    razonSocial: dto.razon_social,
    fechaNacimiento: dto.fecha_nacimiento,
    provincia: dto.provincia,
    canton: dto.canton,
    parroquia: dto.parroquia,
    direcciones: dto.direcciones ?? [],
    telefonos: dto.telefonos ?? [],
    correos: dto.correos ?? [],
    indiceDireccionPrincipal: dto.indice_direccion_principal,
    indiceTelefonoPrincipal: dto.indice_telefono_principal,
    indiceCorreoPrincipal: dto.indice_correo_principal,
    direccionFiscal: dto.direccion_fiscal,
    telefonoFiscal: dto.telefono_fiscal,
    correoFiscal: dto.correo_fiscal,
    notas: dto.notas,
    activo: dto.activo,
    totalVehiculos: dto.total_vehiculos,
    placas: dto.placas ?? [],
    correoPrincipal: dto.correo_principal,
  };
}

function mapVehiculo(dto: VehiculoApiDto): Vehiculo {
  return {
    id: dto.id,
    empresaId: dto.empresa_id,
    puntoEmisionId: dto.punto_emision_id,
    clienteId: dto.cliente_id,
    placa: dto.placa,
    marca: dto.marca,
    modelo: dto.modelo,
    anio: dto.anio,
    tipo: dto.tipo,
    color: dto.color,
    combustible: dto.combustible,
    cilindrada: dto.cilindrada,
    transmision: dto.transmision,
    notas: dto.notas,
    activo: dto.activo,
    clienteNombres: dto.cliente_nombres,
    clienteIdentificacion: dto.cliente_identificacion,
  };
}

export async function listarVehiculos(
  token: string,
  params: { page?: number; size?: number; search?: string },
): Promise<{ data: Vehiculo[]; total: number }> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    size: String(params.size ?? 20),
  });
  if (params.search) query.set("search", params.search);
  const dto = await httpClient<ListaApi<VehiculoApiDto>>(`/vehiculos/?${query.toString()}`, { token });
  return { data: dto.data.map(mapVehiculo), total: dto.total };
}

export async function altaRapidaClienteVehiculo(
  token: string,
  body: { nombres?: string; placa: string; cliente_id?: number },
): Promise<{ cliente: Cliente; vehiculo: Vehiculo }> {
  const dto = await httpClient<DataApi<{ cliente: ClienteApiDto; vehiculo: VehiculoApiDto }>>("/clientes/alta-rapida", {
    method: "POST",
    token,
    body,
  });
  return { cliente: mapCliente(dto.data.cliente), vehiculo: mapVehiculo(dto.data.vehiculo) };
}

export async function listarClientes(
  token: string,
  params: { page: number; size: number; search?: string },
): Promise<ListaClientes> {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  });
  if (params.search) {
    query.set("search", params.search);
  }
  const dto = await httpClient<ListaApi<ClienteApiDto>>(`/clientes/?${query.toString()}`, { token });
  return {
    data: dto.data.map(mapCliente),
    total: dto.total,
    page: dto.page,
    size: dto.size,
    pages: dto.pages,
  };
}

export async function obtenerCliente(token: string, id: number): Promise<Cliente> {
  const dto = await httpClient<DataApi<ClienteApiDto>>(`/clientes/${id}`, { token });
  return mapCliente(dto.data);
}

export async function crearCliente(token: string, body: ClienteInput): Promise<Cliente> {
  const dto = await httpClient<DataApi<ClienteApiDto>>("/clientes/", { method: "POST", token, body });
  return mapCliente(dto.data);
}

export async function actualizarCliente(token: string, id: number, body: ClienteInput): Promise<Cliente> {
  const dto = await httpClient<DataApi<ClienteApiDto>>(`/clientes/${id}`, { method: "PUT", token, body });
  return mapCliente(dto.data);
}

export async function eliminarCliente(token: string, id: number): Promise<void> {
  await httpClient<void>(`/clientes/${id}`, { method: "DELETE", token });
}

export async function listarVehiculosCliente(
  token: string,
  clienteId: number,
  params?: { page?: number; size?: number; placa?: string; marca?: string; modelo?: string; anio?: string },
): Promise<{ data: Vehiculo[]; total: number; page: number; size: number }> {
  const query = new URLSearchParams({
    page: String(params?.page ?? 1),
    size: String(params?.size ?? 10),
  });
  if (params?.placa) query.set("placa", params.placa);
  if (params?.marca) query.set("marca", params.marca);
  if (params?.modelo) query.set("modelo", params.modelo);
  if (params?.anio) query.set("anio", params.anio);
  const dto = await httpClient<ListaApi<VehiculoApiDto>>(`/clientes/${clienteId}/vehiculos?${query.toString()}`, { token });
  return { data: dto.data.map(mapVehiculo), total: dto.total, page: dto.page, size: dto.size };
}

export async function transferirVehiculos(
  token: string,
  asignaciones: { vehiculo_id: number; cliente_destino_id: number }[],
): Promise<Vehiculo[]> {
  const dto = await httpClient<DataApi<VehiculoApiDto[]>>("/vehiculos/transferir", {
    method: "POST",
    token,
    body: { asignaciones },
  });
  return dto.data.map(mapVehiculo);
}

export async function crearVehiculo(token: string, body: VehiculoInput): Promise<Vehiculo> {
  const dto = await httpClient<DataApi<VehiculoApiDto>>("/vehiculos/", { method: "POST", token, body });
  return mapVehiculo(dto.data);
}

export async function actualizarVehiculo(token: string, id: number, body: Partial<VehiculoInput>): Promise<Vehiculo> {
  const dto = await httpClient<DataApi<VehiculoApiDto>>(`/vehiculos/${id}`, { method: "PUT", token, body });
  return mapVehiculo(dto.data);
}

export async function eliminarVehiculo(token: string, id: number): Promise<void> {
  await httpClient<void>(`/vehiculos/${id}`, { method: "DELETE", token });
}
