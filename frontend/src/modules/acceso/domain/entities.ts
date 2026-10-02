export interface PuntoEmision {
  id: number;
  empresaId: number;
  codigo: string;
  puntoEmision: string;
  nombre: string;
  direccion: string;
}

export interface Empresa {
  id: number;
  nombre: string;
  slug: string;
  ruc: string;
  puntosEmision: PuntoEmision[];
}

export interface Usuario {
  id: number;
  correo: string;
  nombreUsuario: string;
  nombreCompleto: string;
  empresaId: number;
  activo: boolean;
  verificado: boolean;
  roles: string[];
}

export interface Sesion {
  accessToken: string | null;
  refreshToken: string | null;
  expiraEn: number | null;
  refreshExpiraEn: number | null;
  accessTokenCreadoEn: number | null;
  usuario: Usuario;
  empresas: Empresa[];
  empresaId: number | null;
  puntoEmisionId: number | null;
  requiereSeleccion: boolean;
}
