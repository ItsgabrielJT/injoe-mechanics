export interface EmpresaConfig {
  id: number;
  nombre: string;
  slug: string;
  ruc: string;
  direccion: string;
  telefono: string | null;
  correo: string | null;
  sriId: number | null;
  entornoSri: string;
  moneda: string;
  rutaLogo: string | null;
}

export interface PuntoConfig {
  id: number;
  empresaId: number;
  puntoEmision: string;
  codigo: string;
  direccion: string;
  info: string | null;
  facturaSeq: number;
  notaCreditoSeq: number;
  notaDebitoSeq: number;
  retencionSeq: number;
  liquidacionCompraSeq: number;
  guiaRemisionSeq: number;
}

export interface CertificadoInfo {
  id: number;
  ruc: string;
  razonSocial: string;
  fingerprint: string;
  fechaExpiracion: string;
  creadoEn: string | null;
  isActive: boolean;
}
