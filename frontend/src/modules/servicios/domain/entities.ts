export type CategoriaServicio =
  | "consultoria"
  | "desarrollo"
  | "mantenimiento"
  | "soporte"
  | "capacitacion"
  | "otros";

export type TipoImpuesto = "0" | "5" | "15" | "no_objeto" | "exento_iva";

export interface Servicio {
  id: number;
  empresaId: number;
  puntoEmisionId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: CategoriaServicio | null;
  precioVenta: number;
  aplicaIva: boolean;
  tipoImpuesto: TipoImpuesto;
  peso: number | null;
  activo: boolean;
}

export interface ServicioInput {
  nombre: string;
  precio_venta: number;
  tipo_impuesto: TipoImpuesto;
  codigo?: string | null;
  descripcion?: string | null;
  categoria?: CategoriaServicio | null;
  aplica_iva?: boolean;
  peso?: number | null;
  activo?: boolean;
}

export const CATEGORIAS_SERVICIO: { value: CategoriaServicio; label: string }[] = [
  { value: "consultoria", label: "Consultoría" },
  { value: "desarrollo", label: "Desarrollo" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "soporte", label: "Soporte" },
  { value: "capacitacion", label: "Capacitación" },
  { value: "otros", label: "Otros" },
];

export const TIPOS_IMPUESTO: { value: TipoImpuesto; label: string }[] = [
  { value: "15", label: "15%" },
  { value: "5", label: "5%" },
  { value: "0", label: "0%" },
  { value: "no_objeto", label: "No objeto" },
  { value: "exento_iva", label: "Exento IVA" },
];

export function etiquetaCategoria(valor: CategoriaServicio | null): string {
  return CATEGORIAS_SERVICIO.find((item) => item.value === valor)?.label ?? "—";
}

export function etiquetaImpuesto(valor: TipoImpuesto): string {
  return TIPOS_IMPUESTO.find((item) => item.value === valor)?.label ?? valor;
}

export function generarCodigoServicio(): string {
  const letras = Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
  const numeros = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return `${letras}-${numeros}`;
}
