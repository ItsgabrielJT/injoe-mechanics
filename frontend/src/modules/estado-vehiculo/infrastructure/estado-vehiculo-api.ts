import { httpClient } from "@/shared/infrastructure/http/http-client";
import type { TipoImpuesto } from "@/modules/inventario/domain/entities";
import type { ItemOrden } from "@/modules/ordenes-trabajo/domain/entities";
import type {
  EstadoVehiculo,
  FiltrosEstadoVehiculo,
  OrdenEstado,
  TotalesEstadoVehiculo,
} from "@/modules/estado-vehiculo/domain/entities";

interface ItemDto {
  id: number;
  producto_id: number | null;
  servicio_id: number | null;
  proveedor_id: number | null;
  bodega_id: number | null;
  descripcion: string;
  codigo: string | null;
  cantidad: number | string;
  precio_venta: number | string;
  precio_compra: number | string;
  aplica_iva: boolean;
  tipo_impuesto: TipoImpuesto;
  utilidad: number | string;
  total: number | string;
  proveedor_nombres: string | null;
  bodega_nombre: string | null;
}

interface OrdenDto {
  id: number;
  numero: string;
  estado: "EN_PROCESO" | "CERRADA";
  fecha_inicio: string;
  fecha_entrega: string | null;
  kilometraje: number | string | null;
  tecnico_nombre: string | null;
  total_costo: number | string;
  total_utilidad: number | string;
  total: number | string;
  notas_generales: string | null;
  notas_tecnicas: string | null;
  items: ItemDto[];
}

interface EstadoDto {
  vehiculo_id: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  color: string | null;
  cliente_id: number;
  cliente_nombres: string;
  cliente_identificacion: string | null;
  ordenes_count: number;
  ultima_fecha: string | null;
  total_costo: number | string;
  total_utilidad: number | string;
  total: number | string;
  ordenes: OrdenDto[];
}

interface ListaApi {
  data: EstadoDto[];
  total: number;
  page: number;
  size: number;
  pages: number;
  totales?: {
    vehiculos: number;
    ordenes: number;
    total_costo: number | string;
    total_utilidad: number | string;
    total: number | string;
  };
}

function n(valor: number | string | null | undefined): number {
  return Number(valor || 0);
}

function queryEstado(params: FiltrosEstadoVehiculo & { page?: number; size?: number }): URLSearchParams {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.size) query.set("size", String(params.size));
  if (params.placa) query.set("placa", params.placa);
  if (params.marca) query.set("marca", params.marca);
  if (params.modelo) query.set("modelo", params.modelo);
  if (params.cliente) query.set("cliente", params.cliente);
  if (params.identificacion) query.set("identificacion", params.identificacion);
  if (params.fecha_desde) query.set("fecha_desde", params.fecha_desde);
  if (params.fecha_hasta) query.set("fecha_hasta", params.fecha_hasta);
  return query;
}

function mapItem(dto: ItemDto): ItemOrden {
  return {
    id: dto.id,
    productoId: dto.producto_id,
    servicioId: dto.servicio_id,
    proveedorId: dto.proveedor_id,
    bodegaId: dto.bodega_id,
    descripcion: dto.descripcion,
    codigo: dto.codigo,
    cantidad: n(dto.cantidad),
    precioVenta: n(dto.precio_venta),
    precioCompra: n(dto.precio_compra),
    aplicaIva: dto.aplica_iva,
    tipoImpuesto: dto.tipo_impuesto,
    utilidad: n(dto.utilidad),
    total: n(dto.total),
    proveedorNombres: dto.proveedor_nombres,
    bodegaNombre: dto.bodega_nombre,
  };
}

function mapOrden(dto: OrdenDto): OrdenEstado {
  return {
    id: dto.id,
    numero: dto.numero,
    estado: dto.estado,
    fechaInicio: dto.fecha_inicio,
    fechaEntrega: dto.fecha_entrega,
    kilometraje: dto.kilometraje == null ? null : n(dto.kilometraje),
    tecnicoNombre: dto.tecnico_nombre,
    totalCosto: n(dto.total_costo),
    totalUtilidad: n(dto.total_utilidad),
    total: n(dto.total),
    notasGenerales: dto.notas_generales,
    notasTecnicas: dto.notas_tecnicas,
    items: (dto.items ?? []).map(mapItem),
  };
}

function mapEstado(dto: EstadoDto): EstadoVehiculo {
  return {
    vehiculoId: dto.vehiculo_id,
    placa: dto.placa,
    marca: dto.marca,
    modelo: dto.modelo,
    anio: dto.anio,
    color: dto.color,
    clienteId: dto.cliente_id,
    clienteNombres: dto.cliente_nombres,
    clienteIdentificacion: dto.cliente_identificacion,
    ordenesCount: dto.ordenes_count,
    ultimaFecha: dto.ultima_fecha,
    totalCosto: n(dto.total_costo),
    totalUtilidad: n(dto.total_utilidad),
    total: n(dto.total),
    ordenes: (dto.ordenes ?? []).map(mapOrden),
  };
}

function mapTotales(dto?: ListaApi["totales"]): TotalesEstadoVehiculo {
  return {
    vehiculos: Number(dto?.vehiculos || 0),
    ordenes: Number(dto?.ordenes || 0),
    totalCosto: n(dto?.total_costo),
    totalUtilidad: n(dto?.total_utilidad),
    total: n(dto?.total),
  };
}

export async function listarEstadoVehiculo(
  token: string,
  params: FiltrosEstadoVehiculo & { page: number; size: number },
): Promise<{ data: EstadoVehiculo[]; total: number; pages: number; totales: TotalesEstadoVehiculo }> {
  const dto = await httpClient<ListaApi>(`/estado-vehiculo/?${queryEstado(params)}`, { token });
  return {
    data: dto.data.map(mapEstado),
    total: dto.total,
    pages: dto.pages,
    totales: mapTotales(dto.totales),
  };
}

export async function listarEstadoVehiculoReporte(
  token: string,
  params: FiltrosEstadoVehiculo,
): Promise<{ data: EstadoVehiculo[]; totales: TotalesEstadoVehiculo }> {
  const filas: EstadoVehiculo[] = [];
  let page = 1;
  let pages = 1;
  let totales: TotalesEstadoVehiculo = mapTotales();
  while (page <= pages) {
    const resp = await listarEstadoVehiculo(token, { ...params, page, size: 200 });
    filas.push(...resp.data);
    totales = resp.totales;
    pages = resp.pages || 1;
    page += 1;
  }
  return { data: filas, totales };
}

export async function obtenerHistorialVehiculo(
  token: string,
  vehiculoId: number,
  params: Pick<FiltrosEstadoVehiculo, "fecha_desde" | "fecha_hasta"> = {},
): Promise<EstadoVehiculo> {
  const query = queryEstado(params);
  const dto = await httpClient<{ data: EstadoDto }>(`/estado-vehiculo/${vehiculoId}?${query}`, { token });
  return mapEstado(dto.data);
}
