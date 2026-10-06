import type { TipoImpuesto } from "@/modules/inventario/domain/entities";

export type EstadoFactura = "BORRADOR" | "ENVIADA" | "PENDIENTE_AUTORIZACION" | "AUTORIZADA" | "RECHAZADA" | "CANCELADA";
export type TipoReceptor = "cliente" | "consumidor_final";

export interface ItemFactura {
  id: number;
  productoId: number | null;
  servicioId: number | null;
  descripcion: string;
  codigo: string | null;
  cantidad: number;
  precioUnitario: number;
  descuentoPorcentaje: number;
  aplicaIva: boolean;
  tipoImpuesto: TipoImpuesto;
  bodegaId: number | null;
  bodegaNombre: string | null;
  aplicaInventario: boolean;
  subtotal: number;
  ivaAmount: number;
  total: number;
}

export interface Factura {
  id: number;
  numero: string;
  tipoReceptor: TipoReceptor;
  estado: EstadoFactura;
  clienteId: number | null;
  ordenTrabajoId: number | null;
  formaPagoId: number | null;
  fechaEmision: string;
  fechaVencimiento: string | null;
  fechaPago: string | null;
  fechaAutorizacion: string | null;
  claveAcceso: string | null;
  xmlContent: string | null;
  reasonError: string | null;
  subtotal15: number;
  subtotal5: number;
  subtotal0: number;
  subtotalObjeto: number;
  subtotalExento: number;
  iva15: number;
  iva5: number;
  iva0: number;
  subtotal: number;
  descuento: number;
  total: number;
  notas: string | null;
  terminos: string | null;
  clienteNombres: string | null;
  clienteIdentificacion: string | null;
  clienteCorreo: string | null;
  clienteDireccion: string | null;
  clienteTelefono: string | null;
  formaPagoNombre: string | null;
  formaPagoSriCodigo: string | null;
  numeroAutorizacion: string | null;
  items: ItemFactura[];
}

export interface FormaPago {
  id: number;
  codigo: string;
  nombre: string;
  formaPagoSriCodigo: string | null;
}

export interface ItemFacturaInput {
  producto_id?: number | null;
  servicio_id?: number | null;
  descripcion: string;
  codigo?: string | null;
  cantidad: number;
  precio_unitario: number;
  descuento_porcentaje: number;
  aplica_iva: boolean;
  tipo_impuesto: TipoImpuesto;
  bodega_id?: number | null;
}

export interface FacturaInput {
  tipo_receptor: TipoReceptor;
  cliente_id?: number | null;
  forma_pago_id?: number | null;
  fecha_emision: string;
  fecha_vencimiento?: string | null;
  fecha_pago?: string | null;
  notas?: string | null;
  terminos?: string | null;
  items: ItemFacturaInput[];
  orden_trabajo_id?: number | null;
}

export function tasaIva(tipo: TipoImpuesto, aplicaIva: boolean): number {
  if (tipo === "15") return 0.15;
  if (tipo === "5") return 0.05;
  return 0;
}

export function precioBaseCatalogo(precio: number, aplicaIva: boolean, tipo: TipoImpuesto): number {
  const tasa = tasaIva(tipo, aplicaIva);
  if (aplicaIva && tasa > 0) return Math.round((precio / (1 + tasa)) * 100) / 100;
  return Math.round(precio * 100) / 100;
}

export function precioConIva(base: number, tipo: TipoImpuesto): number {
  const tasa = tasaIva(tipo, true);
  return Math.round(base * (1 + tasa) * 100) / 100;
}

export const TIPOS_IMPUESTO: { value: TipoImpuesto; label: string }[] = [
  { value: "15", label: "IVA 15%" },
  { value: "5", label: "IVA 5%" },
  { value: "0", label: "0%" },
  { value: "no_objeto", label: "No objeto" },
  { value: "exento_iva", label: "Exento" },
];

export interface TotalesFactura {
  cantidad: number;
  subtotal: number;
  iva15: number;
  iva5: number;
  iva0: number;
  total: number;
}

export interface EstadoEstadistica {
  estado: EstadoFactura;
  cantidad: number;
  subtotal: number;
  iva15: number;
  iva5: number;
  iva0: number;
  total: number;
  numeros: string[];
}

export interface ImpuestoEstadistica {
  tasa: number;
  subtotal: number;
  iva: number;
  total: number;
}

export interface EstadisticasFactura {
  fechaDesde: string | null;
  fechaHasta: string | null;
  porEstado: EstadoEstadistica[];
  totales: TotalesFactura;
  porImpuesto: ImpuestoEstadistica[];
}

export function etiquetaEstado(estado: EstadoFactura): string {
  return {
    BORRADOR: "Borrador",
    ENVIADA: "Enviada",
    PENDIENTE_AUTORIZACION: "Pendiente SRI",
    AUTORIZADA: "Autorizada",
    RECHAZADA: "Rechazada",
    CANCELADA: "Cancelada",
  }[estado];
}

export function claseChipEstado(estado: EstadoFactura): string {
  if (estado === "AUTORIZADA") return "bg-emerald-600 text-white border-emerald-600";
  if (estado === "RECHAZADA") return "bg-red-600 text-white border-red-600";
  if (estado === "CANCELADA") return "bg-slate-600 text-white border-slate-600";
  if (estado === "PENDIENTE_AUTORIZACION") return "bg-amber-500 text-white border-amber-500";
  if (estado === "ENVIADA") return "bg-sky-600 text-white border-sky-600";
  return "bg-zinc-200 text-zinc-800 border-zinc-300";
}

export function mensajeErrorSri(reasonError: string | null | undefined): string | null {
  if (!reasonError) return null;
  try {
    const parsed = JSON.parse(reasonError) as { message?: string };
    return parsed.message?.trim() || reasonError;
  } catch {
    return reasonError;
  }
}

export function nombreCliente(factura: Pick<Factura, "tipoReceptor" | "clienteNombres">): string {
  return factura.tipoReceptor === "consumidor_final" ? "Consumidor final" : factura.clienteNombres || "Cliente";
}

export function numeroAutorizacionSri(
  factura: Pick<Factura, "numeroAutorizacion" | "claveAcceso" | "estado" | "fechaAutorizacion">,
): string | null {
  const numero = (factura.numeroAutorizacion || factura.claveAcceso || "").trim();
  if (!numero) return null;
  if (factura.numeroAutorizacion || factura.fechaAutorizacion || factura.estado === "AUTORIZADA") {
    return numero;
  }
  return null;
}

export function subtotalFactura(factura: Pick<Factura, "subtotal15" | "subtotal5" | "subtotal0" | "subtotalObjeto" | "subtotalExento" | "subtotal">): number {
  if (typeof factura.subtotal === "number") return factura.subtotal;
  return factura.subtotal15 + factura.subtotal5 + factura.subtotal0 + factura.subtotalObjeto + factura.subtotalExento;
}

export function numeroVacio(valor: string): number {
  if (valor.trim() === "") return 0;
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}
