import { httpClient } from "@/shared/infrastructure/http/http-client";
import type { TipoImpuesto } from "@/modules/inventario/domain/entities";
import type {
  EstadoFactura,
  EstadisticasFactura,
  Factura,
  FacturaInput,
  FormaPago,
  ItemFactura,
  TipoReceptor,
  TotalesFactura,
} from "@/modules/facturacion/domain/entities";

interface ItemDto {
  id: number;
  producto_id: number | null;
  servicio_id: number | null;
  descripcion: string;
  codigo: string | null;
  cantidad: number | string;
  precio_unitario: number | string;
  descuento_porcentaje: number | string;
  aplica_iva: boolean;
  tipo_impuesto: TipoImpuesto;
  bodega_id?: number | null;
  bodega_nombre?: string | null;
  aplica_inventario?: boolean;
  subtotal: number | string;
  iva_amount: number | string;
  total: number | string;
}

interface FacturaDto {
  id: number;
  numero: string;
  tipo_receptor: TipoReceptor;
  estado: EstadoFactura;
  cliente_id: number | null;
  orden_trabajo_id: number | null;
  forma_pago_id: number | null;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  fecha_pago: string | null;
  fecha_autorizacion: string | null;
  clave_acceso: string | null;
  xml_content: string | null;
  reason_error: string | null;
  numero_autorizacion?: string | null;
  subtotal_15: number | string;
  subtotal_5: number | string;
  subtotal_0: number | string;
  subtotal_objeto: number | string;
  subtotal_exento: number | string;
  iva_15: number | string;
  iva_5: number | string;
  iva_0?: number | string;
  subtotal?: number | string;
  descuento: number | string;
  total: number | string;
  notas: string | null;
  terminos: string | null;
  cliente_nombres: string | null;
  cliente_identificacion: string | null;
  cliente_correo: string | null;
  cliente_direccion?: string | null;
  cliente_telefono?: string | null;
  forma_pago_nombre: string | null;
  forma_pago_sri_codigo?: string | null;
  items: ItemDto[];
}

function n(valor: number | string | null | undefined): number {
  return Number(valor || 0);
}

function mapItem(dto: ItemDto): ItemFactura {
  return {
    id: dto.id,
    productoId: dto.producto_id,
    servicioId: dto.servicio_id,
    descripcion: dto.descripcion,
    codigo: dto.codigo,
    cantidad: n(dto.cantidad),
    precioUnitario: n(dto.precio_unitario),
    descuentoPorcentaje: n(dto.descuento_porcentaje),
    aplicaIva: dto.aplica_iva,
    tipoImpuesto: dto.tipo_impuesto,
    bodegaId: dto.bodega_id ?? null,
    bodegaNombre: dto.bodega_nombre ?? null,
    aplicaInventario: dto.aplica_inventario ?? Boolean(dto.producto_id),
    subtotal: n(dto.subtotal),
    ivaAmount: n(dto.iva_amount),
    total: n(dto.total),
  };
}

function mapFactura(dto: FacturaDto): Factura {
  return {
    id: dto.id,
    numero: dto.numero,
    tipoReceptor: dto.tipo_receptor,
    estado: dto.estado,
    clienteId: dto.cliente_id,
    ordenTrabajoId: dto.orden_trabajo_id,
    formaPagoId: dto.forma_pago_id,
    fechaEmision: dto.fecha_emision,
    fechaVencimiento: dto.fecha_vencimiento,
    fechaPago: dto.fecha_pago,
    fechaAutorizacion: dto.fecha_autorizacion,
    claveAcceso: dto.clave_acceso,
    xmlContent: dto.xml_content,
    reasonError: dto.reason_error,
    numeroAutorizacion: dto.numero_autorizacion ?? null,
    subtotal15: n(dto.subtotal_15),
    subtotal5: n(dto.subtotal_5),
    subtotal0: n(dto.subtotal_0),
    subtotalObjeto: n(dto.subtotal_objeto),
    subtotalExento: n(dto.subtotal_exento),
    iva15: n(dto.iva_15),
    iva5: n(dto.iva_5),
    iva0: n(dto.iva_0),
    subtotal: dto.subtotal != null && dto.subtotal !== ""
      ? n(dto.subtotal)
      : n(dto.subtotal_15) + n(dto.subtotal_5) + n(dto.subtotal_0) + n(dto.subtotal_objeto) + n(dto.subtotal_exento),
    descuento: n(dto.descuento),
    total: n(dto.total),
    notas: dto.notas,
    terminos: dto.terminos,
    clienteNombres: dto.cliente_nombres,
    clienteIdentificacion: dto.cliente_identificacion,
    clienteCorreo: dto.cliente_correo,
    clienteDireccion: dto.cliente_direccion ?? null,
    clienteTelefono: dto.cliente_telefono ?? null,
    formaPagoNombre: dto.forma_pago_nombre,
    formaPagoSriCodigo: dto.forma_pago_sri_codigo ?? null,
    items: (dto.items || []).map(mapItem),
  };
}

export interface FiltrosFactura {
  page?: number;
  size?: number;
  search?: string;
  estado?: EstadoFactura;
  cliente_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
}

function queryFacturas(params: FiltrosFactura): URLSearchParams {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.size) query.set("size", String(params.size));
  if (params.search) query.set("search", params.search);
  if (params.estado) query.set("estado", params.estado);
  if (params.cliente_id) query.set("cliente_id", String(params.cliente_id));
  if (params.fecha_desde) query.set("fecha_desde", params.fecha_desde);
  if (params.fecha_hasta) query.set("fecha_hasta", params.fecha_hasta);
  return query;
}

function mapTotales(dto?: { cantidad: number; subtotal: number | string; iva_15: number | string; iva_5: number | string; iva_0: number | string; total: number | string } | null): TotalesFactura {
  return {
    cantidad: Number(dto?.cantidad || 0),
    subtotal: n(dto?.subtotal),
    iva15: n(dto?.iva_15),
    iva5: n(dto?.iva_5),
    iva0: n(dto?.iva_0),
    total: n(dto?.total),
  };
}

export async function listarFacturas(token: string, params: FiltrosFactura = {}) {
  const resp = await httpClient<{
    data: FacturaDto[];
    total: number;
    page: number;
    size: number;
    pages: number;
    totales?: { cantidad: number; subtotal: number | string; iva_15: number | string; iva_5: number | string; iva_0: number | string; total: number | string };
  }>(`/facturas/?${queryFacturas(params).toString()}`, { token });
  return { ...resp, data: resp.data.map(mapFactura), totales: mapTotales(resp.totales) };
}

export async function listarFacturasReporte(token: string, params: Omit<FiltrosFactura, "page" | "size"> = {}): Promise<Factura[]> {
  const filas: Factura[] = [];
  let page = 1;
  let pages = 1;
  while (page <= pages) {
    const resp = await listarFacturas(token, { ...params, page, size: 200 });
    filas.push(...resp.data);
    pages = resp.pages || 1;
    page += 1;
  }
  return filas;
}

export async function obtenerFactura(token: string, id: number): Promise<Factura> {
  const resp = await httpClient<{ data: FacturaDto }>(`/facturas/${id}`, { token });
  return mapFactura(resp.data);
}

export async function guardarFactura(token: string, body: FacturaInput, id?: number): Promise<Factura> {
  const resp = await httpClient<{ data: FacturaDto }>(id ? `/facturas/${id}` : `/facturas/`, {
    method: id ? "PUT" : "POST",
    token,
    body,
  });
  return mapFactura(resp.data);
}

export async function eliminarFactura(token: string, id: number): Promise<void> {
  await httpClient(`/facturas/${id}`, { method: "DELETE", token });
}

export async function enviarSri(token: string, id: number): Promise<Factura> {
  const resp = await httpClient<{ data: FacturaDto }>(`/facturas/${id}/enviar-sri`, { method: "POST", token });
  return mapFactura(resp.data);
}

export async function cancelarFactura(token: string, id: number): Promise<Factura> {
  const resp = await httpClient<{ data: FacturaDto }>(`/facturas/${id}/cancelar`, { method: "POST", token });
  return mapFactura(resp.data);
}

export async function obtenerEstadisticas(
  token: string,
  params: { fecha_desde?: string; fecha_hasta?: string; cliente_id?: number } = {},
): Promise<EstadisticasFactura> {
  const query = new URLSearchParams();
  if (params.fecha_desde) query.set("fecha_desde", params.fecha_desde);
  if (params.fecha_hasta) query.set("fecha_hasta", params.fecha_hasta);
  if (params.cliente_id) query.set("cliente_id", String(params.cliente_id));
  const resp = await httpClient<{
    data: {
      fecha_desde: string | null;
      fecha_hasta: string | null;
      por_estado: Array<{ estado: EstadoFactura; cantidad: number; subtotal: number | string; iva_15: number | string; iva_5: number | string; iva_0: number | string; total: number | string; numeros: string[] }>;
      totales: { cantidad: number; subtotal: number | string; iva_15: number | string; iva_5: number | string; iva_0: number | string; total: number | string };
      por_impuesto: Array<{ tasa: number; subtotal: number | string; iva: number | string; total: number | string }>;
    };
  }>(`/facturas/estadisticas?${query.toString()}`, { token });
  return {
    fechaDesde: resp.data.fecha_desde,
    fechaHasta: resp.data.fecha_hasta,
    porEstado: resp.data.por_estado.map((fila) => ({
      estado: fila.estado,
      cantidad: Number(fila.cantidad || 0),
      subtotal: n(fila.subtotal),
      iva15: n(fila.iva_15),
      iva5: n(fila.iva_5),
      iva0: n(fila.iva_0),
      total: n(fila.total),
      numeros: fila.numeros || [],
    })),
    totales: mapTotales(resp.data.totales),
    porImpuesto: resp.data.por_impuesto.map((fila) => ({
      tasa: fila.tasa,
      subtotal: n(fila.subtotal),
      iva: n(fila.iva),
      total: n(fila.total),
    })),
  };
}

export async function crearDesdeOrden(token: string, ordenId: number, body: { tipo_receptor: TipoReceptor; cliente_id?: number | null; forma_pago_id?: number | null }): Promise<Factura> {
  const resp = await httpClient<{ data: FacturaDto }>(`/facturas/desde-orden/${ordenId}`, { method: "POST", token, body });
  return mapFactura(resp.data);
}

export async function listarFormasPago(token: string): Promise<FormaPago[]> {
  const resp = await httpClient<{ data: Array<{ id: number; codigo: string; nombre: string; forma_pago_sri_codigo: string | null }> }>(`/formas-pago/`, { token });
  return resp.data.map((item) => ({
    id: item.id,
    codigo: item.codigo,
    nombre: item.nombre,
    formaPagoSriCodigo: item.forma_pago_sri_codigo,
  }));
}
