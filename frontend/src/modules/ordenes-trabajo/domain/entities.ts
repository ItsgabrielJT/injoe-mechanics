import type { TipoImpuesto } from "@/modules/inventario/domain/entities";

export type EstadoOrden = "EN_PROCESO" | "CERRADA";

export interface ItemOrden {
  id: number;
  productoId: number | null;
  servicioId: number | null;
  proveedorId: number | null;
  bodegaId: number | null;
  descripcion: string;
  codigo: string | null;
  cantidad: number;
  precioVenta: number;
  precioCompra: number;
  aplicaIva: boolean;
  tipoImpuesto: TipoImpuesto;
  utilidad: number;
  total: number;
  proveedorNombres: string | null;
  bodegaNombre: string | null;
}

export interface OrdenTrabajo {
  id: number;
  numero: string;
  clienteId: number;
  vehiculoId: number;
  tecnicoId: number;
  estado: EstadoOrden;
  fechaInicio: string;
  fechaEntrega: string | null;
  kilometraje: number | null;
  notasGenerales: string | null;
  notasTecnicas: string | null;
  totalProductos: number;
  totalServicios: number;
  totalCosto: number;
  totalUtilidad: number;
  total: number;
  clienteNombres: string | null;
  clienteIdentificacion: string | null;
  vehiculoPlaca: string | null;
  vehiculoMarca: string | null;
  vehiculoModelo: string | null;
  tecnicoNombre: string | null;
  items: ItemOrden[];
}

export interface TotalesOrdenes {
  totalCosto: number;
  totalUtilidad: number;
  total: number;
}

export interface Tecnico {
  id: number;
  nombreCompleto: string;
  correo: string;
}

export interface ItemOrdenInput {
  producto_id?: number | null;
  servicio_id?: number | null;
  proveedor_id?: number | null;
  bodega_id?: number | null;
  descripcion?: string | null;
  codigo?: string | null;
  cantidad: number;
  precio_venta: number;
  precio_compra: number;
  aplica_iva: boolean;
  tipo_impuesto: TipoImpuesto;
}

export interface OrdenInput {
  cliente_id: number;
  vehiculo_id: number;
  tecnico_id: number;
  fecha_inicio?: string | null;
  fecha_entrega?: string | null;
  kilometraje?: number | null;
  notas_generales?: string | null;
  notas_tecnicas?: string | null;
  items: ItemOrdenInput[];
}

export function formatoMoneda(valor: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(valor);
}

export function ahoraEcuadorIso(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (tipo: string) => partes.find((item) => item.type === tipo)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}-05:00`;
}
