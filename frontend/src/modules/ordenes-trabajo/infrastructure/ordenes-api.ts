import { httpClient } from "@/shared/infrastructure/http/http-client";
import type { TipoImpuesto } from "@/modules/inventario/domain/entities";
import type {
  EstadoOrden,
  ItemOrden,
  OrdenInput,
  OrdenTrabajo,
  Tecnico,
  TotalesOrdenes,
} from "@/modules/ordenes-trabajo/domain/entities";

interface ListaApi<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
  totales?: { total_costo: number | string; total_utilidad: number | string; total: number | string };
}

interface DataApi<T> {
  data: T;
  message: string;
}

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
  cliente_id: number;
  vehiculo_id: number;
  tecnico_id: number;
  estado: EstadoOrden;
  fecha_inicio: string;
  fecha_entrega: string | null;
  kilometraje: number | string | null;
  notas_generales: string | null;
  notas_tecnicas: string | null;
  total_productos: number | string;
  total_servicios: number | string;
  total_costo: number | string;
  total_utilidad: number | string;
  total: number | string;
  cliente_nombres: string | null;
  cliente_identificacion: string | null;
  vehiculo_placa: string | null;
  vehiculo_marca: string | null;
  vehiculo_modelo: string | null;
  tecnico_nombre: string | null;
  items: ItemDto[];
  factura_id?: number | null;
  factura_numero?: string | null;
  facturada?: boolean;
}

function n(valor: number | string | null | undefined): number {
  return Number(valor || 0);
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

function mapOrden(dto: OrdenDto): OrdenTrabajo {
  return {
    id: dto.id,
    numero: dto.numero,
    clienteId: dto.cliente_id,
    vehiculoId: dto.vehiculo_id,
    tecnicoId: dto.tecnico_id,
    estado: dto.estado,
    fechaInicio: dto.fecha_inicio,
    fechaEntrega: dto.fecha_entrega,
    kilometraje: dto.kilometraje == null ? null : n(dto.kilometraje),
    notasGenerales: dto.notas_generales,
    notasTecnicas: dto.notas_tecnicas,
    totalProductos: n(dto.total_productos),
    totalServicios: n(dto.total_servicios),
    totalCosto: n(dto.total_costo),
    totalUtilidad: n(dto.total_utilidad),
    total: n(dto.total),
    clienteNombres: dto.cliente_nombres,
    clienteIdentificacion: dto.cliente_identificacion,
    vehiculoPlaca: dto.vehiculo_placa,
    vehiculoMarca: dto.vehiculo_marca,
    vehiculoModelo: dto.vehiculo_modelo,
    tecnicoNombre: dto.tecnico_nombre,
    items: (dto.items ?? []).map(mapItem),
    facturaId: dto.factura_id ?? null,
    facturaNumero: dto.factura_numero ?? null,
    facturada: Boolean(dto.facturada),
  };
}

export async function listarOrdenes(
  token: string,
  params: { page: number; size: number; search?: string; estado?: EstadoOrden },
): Promise<{ data: OrdenTrabajo[]; total: number; pages: number; totales: TotalesOrdenes }> {
  const query = new URLSearchParams({ page: String(params.page), size: String(params.size) });
  if (params.search) query.set("search", params.search);
  if (params.estado) query.set("estado", params.estado);
  const dto = await httpClient<ListaApi<OrdenDto>>(`/ordenes-trabajo/?${query}`, { token });
  return {
    data: dto.data.map(mapOrden),
    total: dto.total,
    pages: dto.pages,
    totales: {
      totalCosto: n(dto.totales?.total_costo),
      totalUtilidad: n(dto.totales?.total_utilidad),
      total: n(dto.totales?.total),
    },
  };
}

export async function obtenerOrden(token: string, id: number): Promise<OrdenTrabajo> {
  const dto = await httpClient<DataApi<OrdenDto>>(`/ordenes-trabajo/${id}`, { token });
  return mapOrden(dto.data);
}

export async function guardarOrden(token: string, body: OrdenInput, id?: number): Promise<OrdenTrabajo> {
  const dto = await httpClient<DataApi<OrdenDto>>(id ? `/ordenes-trabajo/${id}` : "/ordenes-trabajo/", {
    method: id ? "PUT" : "POST",
    token,
    body,
  });
  return mapOrden(dto.data);
}

export async function cerrarOrden(token: string, id: number): Promise<OrdenTrabajo> {
  const dto = await httpClient<DataApi<OrdenDto>>(`/ordenes-trabajo/${id}/cerrar`, { method: "POST", token });
  return mapOrden(dto.data);
}

export async function eliminarOrden(token: string, id: number): Promise<void> {
  await httpClient(`/ordenes-trabajo/${id}`, { method: "DELETE", token });
}

export async function listarTecnicos(token: string): Promise<Tecnico[]> {
  const dto = await httpClient<{ data: { id: number; nombre_completo: string; correo: string }[] }>("/usuarios/", { token });
  return dto.data.map((item) => ({ id: item.id, nombreCompleto: item.nombre_completo, correo: item.correo }));
}
