export type TipoImpuesto = "0" | "5" | "15" | "no_objeto" | "exento_iva";

export type TipoMovimiento = "INGRESO" | "SALIDA" | "AJUSTE" | "TRANSFERENCIA" | "STOCK_INICIAL";

export type TipoAjuste = "INGRESO" | "EGRESO";

export type SeveridadAlerta = "warning" | "critical";

export interface CategoriaProducto {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface Bodega {
  id: number;
  nombre: string;
  ubicacion: string | null;
  activo: boolean;
}

export interface Producto {
  id: number;
  codigo: string;
  codigoBarras: string | null;
  nombre: string;
  descripcion: string | null;
  categoriaId: number;
  categoriaNombre: string | null;
  precioVenta: number;
  aplicaIva: boolean;
  aplicaInventario: boolean;
  tipoImpuesto: TipoImpuesto;
  stockMinimo: number;
  stockMaximo: number | null;
  unidadMedida: string;
  peso: number | null;
  activo: boolean;
  stockTotal: number;
}

export interface Existencia {
  productoId: number;
  bodegaId: number;
  bodegaNombre: string | null;
  cantidad: number;
}

export interface AlertaStock {
  productoId: number;
  codigo: string;
  nombre: string;
  stockMinimo: number;
  stockTotal: number;
  severidad: SeveridadAlerta;
}

export interface LineaMovimiento {
  id: number | null;
  productoId: number;
  productoCodigo: string | null;
  productoNombre: string | null;
  cantidad: number;
  stockOrigenDespues: number;
  stockDestinoDespues: number | null;
}

export interface MovimientoInventario {
  id: number;
  codigo: string;
  tipo: TipoMovimiento;
  bodegaId: number;
  bodegaNombre: string | null;
  bodegaDestinoId: number | null;
  bodegaDestinoNombre: string | null;
  tipoAjuste: TipoAjuste | null;
  nota: string | null;
  observacion: string | null;
  creadoEn: string | null;
  lineas: LineaMovimiento[];
}

export interface ItemKardex {
  movimientoId: number;
  codigo: string;
  tipo: TipoMovimiento;
  bodegaId: number;
  bodegaNombre: string;
  bodegaDestinoId: number | null;
  bodegaDestinoNombre: string | null;
  tipoAjuste: TipoAjuste | null;
  cantidad: number;
  stockOrigenDespues: number;
  stockDestinoDespues: number | null;
  nota: string | null;
  creadoEn: string;
}

export interface ProductoReporte {
  producto: Producto;
  kardex: ItemKardex[];
  existencias: Existencia[];
  stockCorte: number;
}

export interface ListaPaginada<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export const TIPOS_IMPUESTO: { value: TipoImpuesto; label: string }[] = [
  { value: "15", label: "15%" },
  { value: "5", label: "5%" },
  { value: "0", label: "0%" },
  { value: "no_objeto", label: "No objeto" },
  { value: "exento_iva", label: "Exento IVA" },
];

export const TIPOS_MOVIMIENTO: { value: TipoMovimiento; label: string }[] = [
  { value: "INGRESO", label: "Ingreso" },
  { value: "SALIDA", label: "Salida" },
  { value: "AJUSTE", label: "Ajuste" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "STOCK_INICIAL", label: "Stock inicial" },
];

export function etiquetaImpuesto(valor: TipoImpuesto): string {
  return TIPOS_IMPUESTO.find((item) => item.value === valor)?.label ?? valor;
}

export function etiquetaMovimiento(valor: TipoMovimiento): string {
  return TIPOS_MOVIMIENTO.find((item) => item.value === valor)?.label ?? valor;
}

export function tasaIva(tipo: TipoImpuesto, aplicaIva: boolean): number {
  if (!aplicaIva) {
    return 0;
  }
  if (tipo === "5") {
    return 0.05;
  }
  if (tipo === "15") {
    return 0.15;
  }
  return 0;
}

export function precioVentaFinal(base: number, incluyeIva: boolean, tipo: TipoImpuesto, aplicaIva: boolean): number {
  const tasa = tasaIva(tipo, aplicaIva);
  const valor = incluyeIva || tasa === 0 ? base : base * (1 + tasa);
  return Math.round(valor * 100) / 100;
}

export function formatoPrecio(valor: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(valor);
}

export function formatoCantidad(valor: number): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
}

export function formatoFecha(valor: string | null): string {
  if (!valor) {
    return "—";
  }
  return new Date(valor).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" });
}

export function resumenProductosMovimiento(lineas: LineaMovimiento[], maximo = 2): string {
  const nombres = lineas.map((linea) => linea.productoNombre || linea.productoCodigo || "Producto");
  if (nombres.length === 0) {
    return "—";
  }
  if (nombres.length <= maximo) {
    return nombres.join(", ");
  }
  return `${nombres.slice(0, maximo).join(", ")}...`;
}
