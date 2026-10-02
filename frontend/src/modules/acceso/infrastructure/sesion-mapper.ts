import type { Empresa, PuntoEmision, Sesion, Usuario } from "@/modules/acceso/domain/entities";

export interface PuntoApiDto {
  id: number;
  empresa_id: number;
  codigo: string;
  punto_emision: string;
  nombre: string;
  direccion: string;
}

export interface EmpresaApiDto {
  id: number;
  nombre: string;
  slug: string;
  ruc: string;
  puntos_emision: PuntoApiDto[];
}

export interface UsuarioApiDto {
  id: number;
  correo: string;
  nombre_usuario: string;
  nombre_completo: string;
  empresa_id: number;
  activo: boolean;
  verificado: boolean;
  roles: string[];
}

export interface SesionApiDto {
  access_token?: string | null;
  refresh_token?: string | null;
  expira_en?: number | null;
  refresh_expira_en?: number | null;
  usuario: UsuarioApiDto;
  empresas: EmpresaApiDto[];
  empresa_id: number | null;
  punto_emision_id: number | null;
  requiere_seleccion: boolean;
}

function mapPunto(dto: PuntoApiDto): PuntoEmision {
  return {
    id: dto.id,
    empresaId: dto.empresa_id,
    codigo: dto.codigo,
    puntoEmision: dto.punto_emision,
    nombre: dto.nombre,
    direccion: dto.direccion,
  };
}

function mapEmpresa(dto: EmpresaApiDto): Empresa {
  return {
    id: dto.id,
    nombre: dto.nombre,
    slug: dto.slug,
    ruc: dto.ruc,
    puntosEmision: dto.puntos_emision.map(mapPunto),
  };
}

function mapUsuario(dto: UsuarioApiDto): Usuario {
  return {
    id: dto.id,
    correo: dto.correo,
    nombreUsuario: dto.nombre_usuario,
    nombreCompleto: dto.nombre_completo,
    empresaId: dto.empresa_id,
    activo: dto.activo,
    verificado: dto.verificado,
    roles: dto.roles,
  };
}

export function mapSesion(dto: SesionApiDto): Sesion {
  return {
    accessToken: dto.access_token ?? null,
    refreshToken: dto.refresh_token ?? null,
    expiraEn: dto.expira_en ?? null,
    refreshExpiraEn: dto.refresh_expira_en ?? null,
    accessTokenCreadoEn: dto.access_token ? Date.now() : null,
    usuario: mapUsuario(dto.usuario),
    empresas: dto.empresas.map(mapEmpresa),
    empresaId: dto.empresa_id,
    puntoEmisionId: dto.punto_emision_id,
    requiereSeleccion: dto.requiere_seleccion,
  };
}
