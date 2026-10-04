import { httpClient } from "@/shared/infrastructure/http/http-client";
import type {
  AlertaStock,
  Bodega,
  CategoriaProducto,
  Existencia,
  ItemKardex,
  ListaPaginada,
  MovimientoInventario,
  Producto,
  ProductoReporte,
  TipoAjuste,
  TipoImpuesto,
  TipoMovimiento,
} from "@/modules/inventario/domain/entities";

interface ListaApi<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface DataApi<T> {
  data: T;
  message: string;
}

interface CategoriaDto {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

interface BodegaDto {
  id: number;
  nombre: string;
  ubicacion: string | null;
  activo: boolean;
}

interface ProductoDto {
  id: number;
  codigo: string;
  codigo_barras: string | null;
  nombre: string;
  descripcion: string | null;
  categoria_id: number;
  categoria_nombre: string | null;
  precio_venta: number | string;
  aplica_iva: boolean;
  aplica_inventario?: boolean;
  tipo_impuesto: TipoImpuesto;
  stock_minimo: number | string;
  stock_maximo: number | string | null;
  unidad_medida: string;
  peso: number | string | null;
  activo: boolean;
  stock_total: number | string;
}

interface MovimientoDto {
  id: number;
  codigo: string;
  tipo: TipoMovimiento;
  bodega_id: number;
  bodega_nombre: string | null;
  bodega_destino_id: number | null;
  bodega_destino_nombre: string | null;
  tipo_ajuste: TipoAjuste | null;
  nota: string | null;
  observacion: string | null;
  creado_en: string | null;
  lineas: {
    id: number | null;
    producto_id: number;
    producto_codigo: string | null;
    producto_nombre: string | null;
    cantidad: number | string;
    stock_origen_despues: number | string;
    stock_destino_despues: number | string | null;
  }[];
}

function aNumero(valor: number | string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }
  const numero = Number(valor);
  return Number.isNaN(numero) ? null : numero;
}

function mapCategoria(dto: CategoriaDto): CategoriaProducto {
  return { id: dto.id, nombre: dto.nombre, descripcion: dto.descripcion, activo: dto.activo };
}

function mapBodega(dto: BodegaDto): Bodega {
  return { id: dto.id, nombre: dto.nombre, ubicacion: dto.ubicacion, activo: dto.activo };
}

function mapProducto(dto: ProductoDto): Producto {
  return {
    id: dto.id,
    codigo: dto.codigo,
    codigoBarras: dto.codigo_barras,
    nombre: dto.nombre,
    descripcion: dto.descripcion,
    categoriaId: dto.categoria_id,
    categoriaNombre: dto.categoria_nombre,
    precioVenta: aNumero(dto.precio_venta) ?? 0,
    aplicaIva: dto.aplica_iva,
    aplicaInventario: dto.aplica_inventario ?? true,
    tipoImpuesto: dto.tipo_impuesto,
    stockMinimo: aNumero(dto.stock_minimo) ?? 0,
    stockMaximo: aNumero(dto.stock_maximo),
    unidadMedida: dto.unidad_medida,
    peso: aNumero(dto.peso),
    activo: dto.activo,
    stockTotal: aNumero(dto.stock_total) ?? 0,
  };
}

function mapMovimiento(dto: MovimientoDto): MovimientoInventario {
  return {
    id: dto.id,
    codigo: dto.codigo,
    tipo: dto.tipo,
    bodegaId: dto.bodega_id,
    bodegaNombre: dto.bodega_nombre,
    bodegaDestinoId: dto.bodega_destino_id,
    bodegaDestinoNombre: dto.bodega_destino_nombre,
    tipoAjuste: dto.tipo_ajuste,
    nota: dto.nota,
    observacion: dto.observacion,
    creadoEn: dto.creado_en,
    lineas: dto.lineas.map((linea) => ({
      id: linea.id,
      productoId: linea.producto_id,
      productoCodigo: linea.producto_codigo,
      productoNombre: linea.producto_nombre,
      cantidad: aNumero(linea.cantidad) ?? 0,
      stockOrigenDespues: aNumero(linea.stock_origen_despues) ?? 0,
      stockDestinoDespues: aNumero(linea.stock_destino_despues),
    })),
  };
}

function mapKardex(dto: {
  movimiento_id: number;
  codigo: string;
  tipo: TipoMovimiento;
  bodega_id: number;
  bodega_nombre: string;
  bodega_destino_id: number | null;
  bodega_destino_nombre: string | null;
  tipo_ajuste: TipoAjuste | null;
  cantidad: number | string;
  stock_origen_despues: number | string;
  stock_destino_despues: number | string | null;
  nota: string | null;
  creado_en: string;
}): ItemKardex {
  return {
    movimientoId: dto.movimiento_id,
    codigo: dto.codigo,
    tipo: dto.tipo,
    bodegaId: dto.bodega_id,
    bodegaNombre: dto.bodega_nombre,
    bodegaDestinoId: dto.bodega_destino_id,
    bodegaDestinoNombre: dto.bodega_destino_nombre,
    tipoAjuste: dto.tipo_ajuste,
    cantidad: aNumero(dto.cantidad) ?? 0,
    stockOrigenDespues: aNumero(dto.stock_origen_despues) ?? 0,
    stockDestinoDespues: aNumero(dto.stock_destino_despues),
    nota: dto.nota,
    creadoEn: dto.creado_en,
  };
}

export interface CategoriaInput {
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
}

export interface BodegaInput {
  nombre: string;
  ubicacion?: string | null;
  activo?: boolean;
}

export interface ProductoInput {
  codigo: string;
  nombre: string;
  categoria_id: number;
  precio_venta: number;
  tipo_impuesto: TipoImpuesto;
  codigo_barras?: string | null;
  descripcion?: string | null;
  aplica_iva?: boolean;
  aplica_inventario?: boolean;
  stock_minimo?: number;
  stock_maximo?: number | null;
  unidad_medida?: string;
  peso?: number | null;
  activo?: boolean;
  stock_inicial?: { bodega_id: number; cantidad: number } | null;
}

export interface MovimientoInput {
  tipo: TipoMovimiento;
  bodega_id: number;
  items: { producto_id: number; cantidad: number }[];
  bodega_destino_id?: number | null;
  tipo_ajuste?: TipoAjuste | null;
  nota?: string | null;
  observacion?: string | null;
}

export interface FiltrosMovimiento {
  page?: number;
  size?: number;
  producto_ids?: number[];
  bodega_ids?: number[];
  tipo?: TipoMovimiento;
  fecha_desde?: string;
  fecha_hasta?: string;
}

function queryLista(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== "") {
      query.set(clave, String(valor));
    }
  });
  return query.toString();
}

function queryIds(query: URLSearchParams, clave: string, ids?: number[]) {
  ids?.forEach((id) => query.append(clave, String(id)));
}

export async function listarCategorias(
  token: string,
  params: { page: number; size: number; search?: string; activo?: boolean },
): Promise<ListaPaginada<CategoriaProducto>> {
  const dto = await httpClient<ListaApi<CategoriaDto>>(`/categorias-producto/?${queryLista(params)}`, { token });
  return { ...dto, data: dto.data.map(mapCategoria) };
}

export async function crearCategoria(token: string, body: CategoriaInput): Promise<CategoriaProducto> {
  const dto = await httpClient<DataApi<CategoriaDto>>("/categorias-producto/", { method: "POST", token, body });
  return mapCategoria(dto.data);
}

export async function actualizarCategoria(token: string, id: number, body: CategoriaInput): Promise<CategoriaProducto> {
  const dto = await httpClient<DataApi<CategoriaDto>>(`/categorias-producto/${id}`, { method: "PUT", token, body });
  return mapCategoria(dto.data);
}

export async function eliminarCategoria(token: string, id: number): Promise<void> {
  await httpClient<void>(`/categorias-producto/${id}`, { method: "DELETE", token });
}

export async function listarBodegas(
  token: string,
  params: { page: number; size: number; search?: string; activo?: boolean },
): Promise<ListaPaginada<Bodega>> {
  const dto = await httpClient<ListaApi<BodegaDto>>(`/bodegas/?${queryLista(params)}`, { token });
  return { ...dto, data: dto.data.map(mapBodega) };
}

export async function crearBodega(token: string, body: BodegaInput): Promise<Bodega> {
  const dto = await httpClient<DataApi<BodegaDto>>("/bodegas/", { method: "POST", token, body });
  return mapBodega(dto.data);
}

export async function actualizarBodega(token: string, id: number, body: BodegaInput): Promise<Bodega> {
  const dto = await httpClient<DataApi<BodegaDto>>(`/bodegas/${id}`, { method: "PUT", token, body });
  return mapBodega(dto.data);
}

export async function eliminarBodega(token: string, id: number): Promise<void> {
  await httpClient<void>(`/bodegas/${id}`, { method: "DELETE", token });
}

export async function listarProductos(
  token: string,
  params: {
    page: number;
    size: number;
    search?: string;
    categoria_id?: number;
    activo?: boolean;
    aplica_inventario?: boolean;
  },
): Promise<ListaPaginada<Producto>> {
  const dto = await httpClient<ListaApi<ProductoDto>>(`/productos/?${queryLista(params)}`, { token });
  return { ...dto, data: dto.data.map(mapProducto) };
}

export async function crearProducto(token: string, body: ProductoInput): Promise<Producto> {
  const dto = await httpClient<DataApi<ProductoDto>>("/productos/", { method: "POST", token, body });
  return mapProducto(dto.data);
}

export async function actualizarProducto(token: string, id: number, body: ProductoInput): Promise<Producto> {
  const dto = await httpClient<DataApi<ProductoDto>>(`/productos/${id}`, { method: "PUT", token, body });
  return mapProducto(dto.data);
}

export async function eliminarProducto(token: string, id: number): Promise<void> {
  await httpClient<void>(`/productos/${id}`, { method: "DELETE", token });
}

export async function listarAlertas(token: string): Promise<AlertaStock[]> {
  const dto = await httpClient<{ data: { producto_id: number; codigo: string; nombre: string; stock_minimo: number | string; stock_total: number | string; severidad: AlertaStock["severidad"] }[] }>(
    "/productos/alertas",
    { token },
  );
  return dto.data.map((item) => ({
    productoId: item.producto_id,
    codigo: item.codigo,
    nombre: item.nombre,
    stockMinimo: aNumero(item.stock_minimo) ?? 0,
    stockTotal: aNumero(item.stock_total) ?? 0,
    severidad: item.severidad,
  }));
}

export async function listarExistencias(token: string, productoId: number): Promise<Existencia[]> {
  const dto = await httpClient<{ data: { producto_id: number; bodega_id: number; bodega_nombre: string | null; cantidad: number | string }[] }>(
    `/productos/${productoId}/existencias`,
    { token },
  );
  return dto.data.map((item) => ({
    productoId: item.producto_id,
    bodegaId: item.bodega_id,
    bodegaNombre: item.bodega_nombre,
    cantidad: aNumero(item.cantidad) ?? 0,
  }));
}

export async function listarKardex(token: string, productoId: number): Promise<ItemKardex[]> {
  const dto = await httpClient<{ data: Parameters<typeof mapKardex>[0][] }>(`/productos/${productoId}/kardex`, { token });
  return dto.data.map(mapKardex);
}

export async function reporteProductos(
  token: string,
  params: {
    page?: number;
    size?: number;
    producto_ids?: number[];
    bodega_ids?: number[];
    fecha_desde?: string;
    fecha_hasta?: string;
  } = {},
): Promise<ListaPaginada<ProductoReporte>> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.size) query.set("size", String(params.size));
  if (params.fecha_desde) query.set("fecha_desde", params.fecha_desde);
  if (params.fecha_hasta) query.set("fecha_hasta", params.fecha_hasta);
  queryIds(query, "producto_ids", params.producto_ids);
  queryIds(query, "bodega_ids", params.bodega_ids);
  const dto = await httpClient<ListaApi<{
    producto: ProductoDto;
    kardex: Parameters<typeof mapKardex>[0][];
    existencias: { producto_id: number; bodega_id: number; bodega_nombre: string | null; cantidad: number | string }[];
    stock_corte: number | string;
  }>>(`/productos/reporte?${query.toString()}`, { token });
  return {
    ...dto,
    data: dto.data.map((item) => ({
      producto: mapProducto(item.producto),
      kardex: item.kardex.map(mapKardex),
      existencias: item.existencias.map((existencia) => ({
        productoId: existencia.producto_id,
        bodegaId: existencia.bodega_id,
        bodegaNombre: existencia.bodega_nombre,
        cantidad: aNumero(existencia.cantidad) ?? 0,
      })),
      stockCorte: aNumero(item.stock_corte) ?? 0,
    })),
  };
}

function queryMovimientos(params: FiltrosMovimiento): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.size) query.set("size", String(params.size));
  if (params.tipo) query.set("tipo", params.tipo);
  if (params.fecha_desde) query.set("fecha_desde", params.fecha_desde);
  if (params.fecha_hasta) query.set("fecha_hasta", params.fecha_hasta);
  queryIds(query, "producto_ids", params.producto_ids);
  queryIds(query, "bodega_ids", params.bodega_ids);
  return query.toString();
}

export async function listarMovimientos(token: string, params: FiltrosMovimiento): Promise<ListaPaginada<MovimientoInventario>> {
  const dto = await httpClient<ListaApi<MovimientoDto>>(`/movimientos-inventario/?${queryMovimientos(params)}`, { token });
  return { ...dto, data: dto.data.map(mapMovimiento) };
}

export async function obtenerMovimiento(token: string, id: number): Promise<MovimientoInventario> {
  const dto = await httpClient<DataApi<MovimientoDto>>(`/movimientos-inventario/${id}`, { token });
  return mapMovimiento(dto.data);
}

export async function registrarMovimiento(token: string, body: MovimientoInput): Promise<MovimientoInventario> {
  const dto = await httpClient<DataApi<MovimientoDto>>("/movimientos-inventario/", { method: "POST", token, body });
  return mapMovimiento(dto.data);
}

export async function reporteMovimientos(token: string, params: FiltrosMovimiento): Promise<MovimientoInventario[]> {
  const dto = await httpClient<{ data: MovimientoDto[] }>(`/movimientos-inventario/reporte?${queryMovimientos(params)}`, { token });
  return dto.data.map(mapMovimiento);
}
