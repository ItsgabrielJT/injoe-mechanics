"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { AlertTriangle, Boxes, Eye, FileText, Package, Pencil, Plus, Search, Trash2, Truck, Warehouse } from "lucide-react";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";
import {
  etiquetaImpuesto,
  etiquetaMovimiento,
  formatoCantidad,
  formatoFecha,
  formatoPrecio,
  precioVentaFinal,
  type AlertaStock,
  type Bodega,
  type CategoriaProducto,
  type Existencia,
  type ItemKardex,
  type Producto,
  type ProductoReporte,
  type TipoImpuesto,
} from "@/modules/inventario/domain/entities";
import { descargarElementoComoPdf } from "@/modules/inventario/infrastructure/descargar-pdf";
import {
  actualizarBodega,
  actualizarCategoria,
  actualizarProducto,
  crearBodega,
  crearCategoria,
  crearProducto,
  eliminarBodega,
  eliminarCategoria,
  eliminarProducto,
  listarAlertas,
  listarBodegas,
  listarCategorias,
  listarExistencias,
  listarKardex,
  listarProductos,
  reporteProductos,
  type ProductoInput,
} from "@/modules/inventario/infrastructure/inventario-api";
import { BuscadorMultiple, type OpcionBuscador } from "@/modules/inventario/presentation/components/buscador-select";
import { BodegaFormDrawer, type BodegaFormValues } from "@/modules/inventario/presentation/forms/bodega-form-drawer";
import { CategoriaFormDrawer, type CategoriaFormValues } from "@/modules/inventario/presentation/forms/categoria-form-drawer";
import { ProductoFormDrawer, type ProductoFormValues } from "@/modules/inventario/presentation/forms/producto-form-drawer";
import { PreciosProveedorPanel } from "@/modules/proveedores";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { MuiDataTable } from "@/shared/components/MuiDataTable";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ApiError } from "@/shared/infrastructure/http/http-error";
import { listarTodasLasPaginas } from "@/shared/lib/listar-todas-las-paginas";
import { cn } from "@/shared/lib/utils";

type Tab = "productos" | "alertas" | "categorias" | "bodegas" | "proveedores";
const MIN_BUSQUEDA = 3;

export function ProductosPage() {
  const { sesion, puntoActivo } = useSesionContext();
  const token = sesion?.accessToken ?? "";
  const [tab, setTab] = useState<Tab>("productos");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [estado, setEstado] = useState("all");
  const [filtroInventario, setFiltroInventario] = useState<"aplica" | "no_aplica" | "todos">("aplica");
  const [cargando, setCargando] = useState(true);

  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [alertas, setAlertas] = useState<AlertaStock[]>([]);

  const [drawerProducto, setDrawerProducto] = useState(false);
  const [productoEdicion, setProductoEdicion] = useState<Producto | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [productoEliminar, setProductoEliminar] = useState<Producto | null>(null);

  const [drawerCategoria, setDrawerCategoria] = useState(false);
  const [categoriaEdicion, setCategoriaEdicion] = useState<CategoriaProducto | null>(null);
  const [categoriaEliminar, setCategoriaEliminar] = useState<CategoriaProducto | null>(null);

  const [drawerBodega, setDrawerBodega] = useState(false);
  const [bodegaEdicion, setBodegaEdicion] = useState<Bodega | null>(null);
  const [bodegaEliminar, setBodegaEliminar] = useState<Bodega | null>(null);

  const [detalle, setDetalle] = useState<Producto | null>(null);
  const [catalogoCostos, setCatalogoCostos] = useState<Producto[]>([]);
  const [idsCostos, setIdsCostos] = useState<number[]>([]);
  const [existencias, setExistencias] = useState<Existencia[]>([]);
  const [kardex, setKardex] = useState<ItemKardex[]>([]);
  const [bodegaKardex, setBodegaKardex] = useState<number | "all">("all");

  const [reporteAbierto, setReporteAbierto] = useState(false);
  const [reporte, setReporte] = useState<ProductoReporte[]>([]);
  const [reporteTotal, setReporteTotal] = useState(0);
  const [reportePage, setReportePage] = useState(0);
  const [reportePageSize, setReportePageSize] = useState(5);
  const [reporteProductoIds, setReporteProductoIds] = useState<number[]>([]);
  const [reporteBodegaIds, setReporteBodegaIds] = useState<number[]>([]);
  const [reporteDesde, setReporteDesde] = useState("");
  const [reporteHasta, setReporteHasta] = useState("");
  const [reporteCargando, setReporteCargando] = useState(false);
  const [catalogoProductos, setCatalogoProductos] = useState<Producto[]>([]);
  const [exportando, setExportando] = useState(false);
  const reporteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const cargarMaestros = useCallback(async () => {
    if (!token) return;
    const [cats, bodes] = await Promise.all([
      listarCategorias(token, { page: 1, size: 200 }),
      listarBodegas(token, { page: 1, size: 200 }),
    ]);
    setCategorias(cats.data);
    setBodegas(bodes.data);
  }, [token]);

  const cargarProductos = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const respuesta = await listarProductos(token, {
        page: page + 1,
        size: pageSize,
        search: debounced || undefined,
        activo: estado === "all" ? undefined : estado === "active",
        aplica_inventario: filtroInventario === "todos" ? undefined : filtroInventario === "aplica",
      });
      setProductos(respuesta.data);
      setTotal(respuesta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar los productos");
    } finally {
      setCargando(false);
    }
  }, [debounced, estado, filtroInventario, page, pageSize, token]);

  const cargarAlertas = useCallback(async () => {
    if (!token) return;
    setAlertas(await listarAlertas(token));
  }, [token]);

  useEffect(() => {
    void cargarMaestros();
  }, [cargarMaestros, puntoActivo?.id]);

  useEffect(() => {
    void cargarProductos();
  }, [cargarProductos, puntoActivo?.id]);

  useEffect(() => {
    if (tab === "alertas") {
      void cargarAlertas();
    }
  }, [cargarAlertas, tab, puntoActivo?.id]);

  const acumularProductos = useCallback((hallados: Producto[], setter: typeof setCatalogoCostos) => {
    setter((prev) => {
      const mapa = new Map(prev.map((item) => [item.id, item]));
      hallados.forEach((item) => mapa.set(item.id, item));
      return [...mapa.values()];
    });
  }, []);

  const buscarProductosCostos = useCallback(async (texto: string): Promise<OpcionBuscador[]> => {
    const termino = texto.trim();
    if (!token || termino.length < MIN_BUSQUEDA) return [];
    const hallados = await listarTodasLasPaginas((page, size) =>
      listarProductos(token, { page, size, search: termino, activo: true }),
    );
    acumularProductos(hallados, setCatalogoCostos);
    return hallados.map((item) => ({
      id: item.id,
      label: `${item.codigo} · ${item.nombre}`,
      extra: formatoPrecio(item.precioVenta),
    }));
  }, [acumularProductos, token]);

  const buscarProductosReporte = useCallback(async (texto: string): Promise<OpcionBuscador[]> => {
    const termino = texto.trim();
    if (!token || termino.length < MIN_BUSQUEDA) return [];
    const hallados = await listarTodasLasPaginas((page, size) =>
      listarProductos(token, { page, size, search: termino }),
    );
    acumularProductos(hallados, setCatalogoProductos);
    return hallados.map((item) => ({
      id: item.id,
      label: `${item.codigo} · ${item.nombre}`,
    }));
  }, [acumularProductos, token]);

  useEffect(() => {
    setPage(0);
  }, [debounced, estado, filtroInventario]);

  async function guardarProducto(values: ProductoFormValues) {
    setGuardando(true);
    setError(null);
    try {
      const precio = precioVentaFinal(Number(values.precio_base), values.incluye_iva, values.tipo_impuesto as TipoImpuesto, values.aplica_iva);
      const body: ProductoInput = {
        codigo: values.codigo.trim().toUpperCase(),
        nombre: values.nombre.trim(),
        categoria_id: values.categoria_id,
        precio_venta: precio,
        tipo_impuesto: values.tipo_impuesto as TipoImpuesto,
        codigo_barras: values.codigo_barras.trim() || null,
        descripcion: values.descripcion.trim() || null,
        aplica_iva: values.aplica_iva,
        aplica_inventario: values.aplica_inventario,
        stock_minimo: Number(values.stock_minimo || 0),
        stock_maximo: values.stock_maximo ?? null,
        unidad_medida: values.unidad_medida || "UN",
        peso: values.peso ?? null,
        activo: values.activo,
        stock_inicial:
          !productoEdicion && values.aplica_inventario && values.registrar_stock && values.bodega_id
            ? { bodega_id: values.bodega_id, cantidad: Number(values.cantidad_inicial) }
            : null,
      };
      if (productoEdicion) {
        await actualizarProducto(token, productoEdicion.id, body);
        setExito("Producto actualizado");
      } else {
        await crearProducto(token, body);
        setExito("Producto registrado");
      }
      setDrawerProducto(false);
      setProductoEdicion(null);
      await Promise.all([cargarProductos(), cargarMaestros()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el producto");
    } finally {
      setGuardando(false);
    }
  }

  async function abrirDetalle(producto: Producto) {
    setDetalle(producto);
    setBodegaKardex("all");
    const [ex, kx] = await Promise.all([listarExistencias(token, producto.id), listarKardex(token, producto.id)]);
    setExistencias(ex);
    setKardex(kx);
  }

  const cargarReporte = useCallback(async () => {
    if (!token || !reporteAbierto) return;
    setReporteCargando(true);
    try {
      const respuesta = await reporteProductos(token, {
        page: reportePage + 1,
        size: reportePageSize,
        producto_ids: reporteProductoIds.length ? reporteProductoIds : undefined,
        bodega_ids: reporteBodegaIds.length ? reporteBodegaIds : undefined,
        fecha_desde: reporteDesde ? new Date(`${reporteDesde}T00:00:00`).toISOString() : undefined,
        fecha_hasta: reporteHasta ? new Date(`${reporteHasta}T23:59:59`).toISOString() : undefined,
      });
      setReporte(respuesta.data);
      setReporteTotal(respuesta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo generar el reporte");
    } finally {
      setReporteCargando(false);
    }
  }, [reporteAbierto, reporteBodegaIds, reporteDesde, reporteHasta, reportePage, reportePageSize, reporteProductoIds, token]);

  useEffect(() => {
    void cargarReporte();
  }, [cargarReporte]);

  useEffect(() => {
    setReportePage(0);
  }, [reporteProductoIds, reporteBodegaIds, reporteDesde, reporteHasta]);

  async function abrirReporte() {
    setReporteAbierto(true);
  }

  const columnsProductos = useMemo<GridColDef[]>(
    () => [
      { field: "codigo", headerName: "Código", minWidth: 110, flex: 0.7 },
      { field: "nombre", headerName: "Nombre", minWidth: 160, flex: 1.3 },
      { field: "categoriaNombre", headerName: "Categoría", minWidth: 130, valueGetter: (value) => value || "—" },
      { field: "precioVenta", headerName: "Precio", minWidth: 110, valueGetter: (value) => formatoPrecio(Number(value) || 0) },
      {
        field: "stockTotal",
        headerName: "Stock",
        minWidth: 110,
        valueGetter: (_value, row) => {
          const producto = row as Producto;
          return producto.aplicaInventario ? formatoCantidad(producto.stockTotal) : "No aplica";
        },
      },
      { field: "tipoImpuesto", headerName: "Impuesto", minWidth: 100, valueGetter: (value) => etiquetaImpuesto(value) },
      { field: "activo", headerName: "Estado", minWidth: 100, valueGetter: (value) => (value ? "Activo" : "Inactivo") },
      {
        field: "acciones",
        headerName: "Acciones",
        minWidth: 140,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const producto = params.row as Producto;
          return (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => void abrirDetalle(producto)}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => { setProductoEdicion(producto); setDrawerProducto(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setProductoEliminar(producto)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  const columnsCategorias = useMemo<GridColDef[]>(
    () => [
      { field: "nombre", headerName: "Nombre", flex: 1, minWidth: 160 },
      { field: "descripcion", headerName: "Descripción", flex: 1.2, minWidth: 160, valueGetter: (value) => value || "—" },
      { field: "activo", headerName: "Estado", minWidth: 100, valueGetter: (value) => (value ? "Activa" : "Inactiva") },
      {
        field: "acciones",
        headerName: "Acciones",
        minWidth: 110,
        sortable: false,
        renderCell: (params) => {
          const item = params.row as CategoriaProducto;
          return (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => { setCategoriaEdicion(item); setDrawerCategoria(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setCategoriaEliminar(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  const columnsBodegas = useMemo<GridColDef[]>(
    () => [
      { field: "nombre", headerName: "Nombre", flex: 1, minWidth: 160 },
      { field: "ubicacion", headerName: "Ubicación", flex: 1, minWidth: 160, valueGetter: (value) => value || "—" },
      { field: "activo", headerName: "Estado", minWidth: 100, valueGetter: (value) => (value ? "Activa" : "Inactiva") },
      {
        field: "acciones",
        headerName: "Acciones",
        minWidth: 110,
        sortable: false,
        renderCell: (params) => {
          const item = params.row as Bodega;
          return (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => { setBodegaEdicion(item); setDrawerBodega(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setBodegaEliminar(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-4 sm:space-y-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Package className="h-7 w-7 text-primary" /> Productos
          </h1>
          <p className="text-sm text-muted-foreground">Crea categorías y bodegas antes de registrar productos.</p>
        </div>
        <div className="flex gap-2">
          {tab === "productos" && (
            <>
              <Button variant="outline" onClick={() => void abrirReporte()}>
                <FileText className="h-4 w-4 mr-2" /> Reporte
              </Button>
              <Button onClick={() => { setProductoEdicion(null); setDrawerProducto(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Nuevo producto
              </Button>
            </>
          )}
          {tab === "categorias" && (
            <Button onClick={() => { setCategoriaEdicion(null); setDrawerCategoria(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nueva categoría
            </Button>
          )}
          {tab === "bodegas" && (
            <Button onClick={() => { setBodegaEdicion(null); setDrawerBodega(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nueva bodega
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg border p-1 bg-muted/30">
        {([
          ["productos", "Productos", Package],
          ["alertas", "Alertas", AlertTriangle],
          ["categorias", "Categorías", Boxes],
          ["bodegas", "Bodegas", Warehouse],
          ["proveedores", "Proveedores", Truck],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
              tab === key ? "bg-primary text-primary-foreground" : "hover:bg-primary/10",
            )}
            onClick={() => setTab(key)}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {exito && <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">{exito}</div>}

      {tab === "productos" && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código, barras o nombre" className="pl-10" />
            </div>
            <select className="flex h-10 rounded-md border border-input px-3 text-sm bg-background sm:w-44" value={estado} onChange={(event) => setEstado(event.target.value)}>
              <option value="all">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
            <select
              className="flex h-10 rounded-md border border-input px-3 text-sm bg-background sm:w-52"
              value={filtroInventario}
              onChange={(event) => setFiltroInventario(event.target.value as "aplica" | "no_aplica" | "todos")}
            >
              <option value="aplica">Aplica stock</option>
              <option value="no_aplica">No aplica stock</option>
              <option value="todos">Todos los productos</option>
            </select>
          </div>
          <MuiDataTable
            rows={productos}
            columns={columnsProductos}
            loading={cargando}
            page={page}
            pageSize={pageSize}
            rowCount={total}
            paginationMode="server"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            storageKey="mecanicos.productos.columnas"
            showToolbar
          />
        </>
      )}

      {tab === "alertas" && (
        <div className="grid gap-3">
          {alertas.length === 0 && <p className="text-sm text-muted-foreground">No hay productos bajo el stock mínimo.</p>}
          {alertas.map((alerta) => (
            <div key={alerta.productoId} className={cn("rounded-lg border px-4 py-3", alerta.severidad === "critical" ? "border-destructive/40 bg-destructive/10" : "border-amber-500/40 bg-amber-500/10")}>
              <p className="font-medium">{alerta.nombre} <span className="text-muted-foreground">({alerta.codigo})</span></p>
              <p className="text-sm">Stock {formatoCantidad(alerta.stockTotal)} / mínimo {formatoCantidad(alerta.stockMinimo)} — {alerta.severidad === "critical" ? "Crítico" : "Stock bajo"}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "categorias" && (
        <MuiDataTable rows={categorias} columns={columnsCategorias} pageSize={10} storageKey="mecanicos.categorias.columnas" showToolbar />
      )}
      {tab === "bodegas" && (
        <MuiDataTable rows={bodegas} columns={columnsBodegas} pageSize={10} storageKey="mecanicos.bodegas.columnas" showToolbar />
      )}
      {tab === "proveedores" && (
        <div className="space-y-4">
          <div className="max-w-xl">
            <p className="mb-1 text-sm font-medium">Productos</p>
            <BuscadorMultiple
              opciones={catalogoCostos.map((item) => ({ id: item.id, label: `${item.codigo} · ${item.nombre}`, extra: formatoPrecio(item.precioVenta) }))}
              valores={idsCostos}
              onChange={setIdsCostos}
              onBuscar={buscarProductosCostos}
              minCaracteres={MIN_BUSQUEDA}
              placeholder="Buscar y agregar productos (mín. 3)"
            />
          </div>
          <PreciosProveedorPanel
            token={token}
            tipo="producto"
            items={idsCostos
              .map((id) => catalogoCostos.find((item) => item.id === id))
              .filter((item): item is Producto => Boolean(item))
              .map((item) => ({ id: item.id, label: `${item.codigo} · ${item.nombre}` }))}
          />
        </div>
      )}

      <ProductoFormDrawer
        abierto={drawerProducto}
        producto={productoEdicion}
        categorias={categorias}
        bodegas={bodegas}
        cargando={guardando}
        onClose={() => setDrawerProducto(false)}
        onSubmit={guardarProducto}
      />
      <CategoriaFormDrawer
        abierto={drawerCategoria}
        categoria={categoriaEdicion}
        cargando={guardando}
        onClose={() => setDrawerCategoria(false)}
        onSubmit={async (values: CategoriaFormValues) => {
          setGuardando(true);
          try {
            if (categoriaEdicion) await actualizarCategoria(token, categoriaEdicion.id, values);
            else await crearCategoria(token, values);
            setDrawerCategoria(false);
            setExito("Categoría guardada");
            await cargarMaestros();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo guardar la categoría");
          } finally {
            setGuardando(false);
          }
        }}
      />
      <BodegaFormDrawer
        abierto={drawerBodega}
        bodega={bodegaEdicion}
        cargando={guardando}
        onClose={() => setDrawerBodega(false)}
        onSubmit={async (values: BodegaFormValues) => {
          setGuardando(true);
          try {
            if (bodegaEdicion) await actualizarBodega(token, bodegaEdicion.id, values);
            else await crearBodega(token, values);
            setDrawerBodega(false);
            setExito("Bodega guardada");
            await cargarMaestros();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo guardar la bodega");
          } finally {
            setGuardando(false);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(productoEliminar)}
        title="Eliminar producto"
        description="Solo se puede eliminar si no tiene movimientos."
        confirmText="Eliminar"
        onClose={() => setProductoEliminar(null)}
        onConfirm={async () => {
          if (!productoEliminar) return;
          try {
            await eliminarProducto(token, productoEliminar.id);
            setProductoEliminar(null);
            setExito("Producto eliminado");
            await cargarProductos();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
          }
        }}
      />
      <ConfirmDialog open={Boolean(categoriaEliminar)} title="Eliminar categoría" confirmText="Eliminar" onClose={() => setCategoriaEliminar(null)} onConfirm={async () => {
        if (!categoriaEliminar) return;
        try {
          await eliminarCategoria(token, categoriaEliminar.id);
          setCategoriaEliminar(null);
          setExito("Categoría eliminada");
          await cargarMaestros();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
        }
      }} />
      <ConfirmDialog open={Boolean(bodegaEliminar)} title="Eliminar bodega" confirmText="Eliminar" onClose={() => setBodegaEliminar(null)} onConfirm={async () => {
        if (!bodegaEliminar) return;
        try {
          await eliminarBodega(token, bodegaEliminar.id);
          setBodegaEliminar(null);
          setExito("Bodega eliminada");
          await cargarMaestros();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
        }
      }} />

      {detalle && tab !== "proveedores" && (
        <Portal>
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDetalle(null)} />
            <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-card p-6 shadow-elegant">
              <div className="flex justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Inventario de {detalle.nombre}</h2>
                  <p className="text-sm text-muted-foreground">{detalle.codigo} · {formatoPrecio(detalle.precioVenta)}</p>
                </div>
                <Button variant="ghost" onClick={() => setDetalle(null)}>Cerrar</Button>
              </div>
              <div className="mb-4 max-w-xs">
                <p className="mb-1 text-xs text-muted-foreground">Filtrar movimientos por bodega</p>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={bodegaKardex === "all" ? "all" : String(bodegaKardex)}
                  onChange={(event) => setBodegaKardex(event.target.value === "all" ? "all" : Number(event.target.value))}
                >
                  <option value="all">Todas las bodegas</option>
                  {Array.from(new Map([
                    ...existencias.map((item) => [item.bodegaId, item.bodegaNombre] as const),
                    ...kardex.flatMap((item) => [
                      [item.bodegaId, item.bodegaNombre] as const,
                      ...(item.bodegaDestinoId ? [[item.bodegaDestinoId, item.bodegaDestinoNombre] as const] : []),
                    ]),
                  ]).entries()).map(([id, nombre]) => (
                    <option key={id} value={id}>{nombre}</option>
                  ))}
                </select>
              </div>
              <h3 className="font-medium mb-2">Stock por bodega</h3>
              {(() => {
                const visibles = bodegaKardex === "all" ? existencias : existencias.filter((item) => item.bodegaId === bodegaKardex);
                if (visibles.length === 0) {
                  return <p className="text-sm text-muted-foreground mb-4">Sin existencias.</p>;
                }
                return (
                  <ul className="mb-4 space-y-1 text-sm">
                    {visibles.map((item) => (
                      <li key={item.bodegaId}>{item.bodegaNombre}: {formatoCantidad(item.cantidad)}</li>
                    ))}
                  </ul>
                );
              })()}
              <h3 className="font-medium mb-2">Kardex</h3>
              <div className="overflow-x-auto text-sm">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-1">Fecha</th>
                      <th>Tipo</th>
                      <th>Bodega</th>
                      <th>Cant.</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(bodegaKardex === "all"
                      ? kardex
                      : kardex.filter((item) => item.bodegaId === bodegaKardex || item.bodegaDestinoId === bodegaKardex)
                    ).map((item) => {
                      const stockVisible = bodegaKardex === "all"
                        ? `${formatoCantidad(item.stockOrigenDespues)}${item.stockDestinoDespues != null ? ` / ${formatoCantidad(item.stockDestinoDespues)}` : ""}`
                        : item.bodegaId === bodegaKardex
                          ? formatoCantidad(item.stockOrigenDespues)
                          : formatoCantidad(item.stockDestinoDespues ?? 0);
                      return (
                        <tr key={`${item.movimientoId}-${item.codigo}`} className="border-t">
                          <td className="py-1">{formatoFecha(item.creadoEn)}</td>
                          <td>{etiquetaMovimiento(item.tipo)}</td>
                          <td>{item.bodegaDestinoNombre ? `${item.bodegaNombre} → ${item.bodegaDestinoNombre}` : item.bodegaNombre}</td>
                          <td>{formatoCantidad(item.cantidad)}</td>
                          <td>{stockVisible}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {reporteAbierto && (
        <Portal>
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setReporteAbierto(false)} />
            <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white text-black shadow-elegant">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <h2 className="text-lg font-semibold">Reporte de productos</h2>
                <div className="flex gap-2">
                  <Button
                    disabled={exportando || reporteCargando}
                    onClick={async () => {
                      if (!reporteRef.current) return;
                      setExportando(true);
                      try {
                        await descargarElementoComoPdf(reporteRef.current, `productos-${puntoActivo?.nombre ?? "reporte"}`);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "No se pudo generar el PDF");
                      } finally {
                        setExportando(false);
                      }
                    }}
                  >
                    {exportando ? "Generando PDF..." : "Descargar PDF"}
                  </Button>
                  <Button variant="outline" onClick={() => setReporteAbierto(false)}>Cerrar</Button>
                </div>
              </div>
              <div className="grid gap-3 border-b px-6 py-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Productos</p>
                  <BuscadorMultiple
                    opciones={catalogoProductos.map((item) => ({ id: item.id, label: `${item.codigo} · ${item.nombre}` }))}
                    valores={reporteProductoIds}
                    onChange={setReporteProductoIds}
                    onBuscar={buscarProductosReporte}
                    minCaracteres={MIN_BUSQUEDA}
                    placeholder="Filtrar productos (mín. 3)"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Bodegas</p>
                  <BuscadorMultiple
                    opciones={bodegas.map((item) => ({ id: item.id, label: item.nombre }))}
                    valores={reporteBodegaIds}
                    onChange={setReporteBodegaIds}
                    placeholder="Filtrar bodegas"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Desde</p>
                  <Input type="date" value={reporteDesde} onChange={(event) => setReporteDesde(event.target.value)} />
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Hasta</p>
                  <Input type="date" value={reporteHasta} onChange={(event) => setReporteHasta(event.target.value)} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {reporteCargando && <p className="text-sm text-muted-foreground">Cargando reporte...</p>}
                <div ref={reporteRef} className="bg-white text-black">
                  <h1 className="text-xl font-bold">Listado de productos y kardex</h1>
                  <p className="mb-4 text-sm">
                    {puntoActivo?.nombre ?? "Punto activo"} · {new Date().toLocaleString("es-EC")}
                    {reporteHasta ? ` · Stock al ${reporteHasta}` : " · Stock actual"}
                    {reporteBodegaIds.length > 0 ? " · Filtrado por bodega" : ""}
                  </p>
                  {reporte.map((fila) => (
                    <section key={fila.producto.id} className="mb-6 overflow-hidden rounded-lg border border-neutral-200">
                      <div className="flex flex-wrap items-start justify-between gap-2 bg-neutral-50 px-4 py-3">
                        <div>
                          <h3 className="font-semibold">{fila.producto.codigo} — {fila.producto.nombre}</h3>
                          <p className="text-xs text-neutral-600">
                            Precio {formatoPrecio(fila.producto.precioVenta)} · Impuesto {etiquetaImpuesto(fila.producto.tipoImpuesto)}
                            {fila.producto.categoriaNombre ? ` · ${fila.producto.categoriaNombre}` : ""}
                          </p>
                        </div>
                        <p className="text-sm font-semibold">Stock al corte: {formatoCantidad(fila.stockCorte)}</p>
                      </div>
                      <div className="px-4 py-3">
                        <table className="mb-3 w-full border-collapse text-xs">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="py-1">Bodega</th>
                              <th className="py-1 text-right">Stock</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fila.existencias.length === 0 && (
                              <tr><td colSpan={2} className="py-1 text-neutral-500">Sin stock en las bodegas filtradas</td></tr>
                            )}
                            {fila.existencias.map((item) => (
                              <tr key={item.bodegaId} className="border-b">
                                <td className="py-1">{item.bodegaNombre}</td>
                                <td className="py-1 text-right">{formatoCantidad(item.cantidad)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="py-1">Fecha</th>
                              <th>Lote</th>
                              <th>Tipo</th>
                              <th>Bodega</th>
                              <th className="text-right">Cant.</th>
                              <th className="text-right">Stock</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fila.kardex.length === 0 && (
                              <tr><td colSpan={6} className="py-2 text-neutral-500">Sin movimientos en el rango seleccionado</td></tr>
                            )}
                            {fila.kardex.map((item) => (
                              <tr key={`${item.movimientoId}-${item.codigo}`} className="border-b">
                                <td className="py-1">{formatoFecha(item.creadoEn)}</td>
                                <td>{item.codigo}</td>
                                <td>{etiquetaMovimiento(item.tipo)}</td>
                                <td>{item.bodegaDestinoNombre ? `${item.bodegaNombre} → ${item.bodegaDestinoNombre}` : item.bodegaNombre}</td>
                                <td className="text-right">{formatoCantidad(item.cantidad)}</td>
                                <td className="text-right">
                                  {formatoCantidad(item.stockOrigenDespues)}
                                  {item.stockDestinoDespues != null ? ` / ${formatoCantidad(item.stockDestinoDespues)}` : ""}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ))}
                  {!reporteCargando && reporte.length === 0 && (
                    <p className="text-sm text-neutral-500">No hay productos para los filtros seleccionados.</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between border-t px-6 py-3 text-sm">
                <p>
                  {reporteTotal === 0
                    ? "0 productos"
                    : `${reportePage * reportePageSize + 1}–${Math.min((reportePage + 1) * reportePageSize, reporteTotal)} de ${reporteTotal}`}
                </p>
                <div className="flex items-center gap-2">
                  <select
                    className="h-9 rounded-md border px-2"
                    value={reportePageSize}
                    onChange={(event) => setReportePageSize(Number(event.target.value))}
                  >
                    {[5, 10, 20].map((size) => <option key={size} value={size}>{size} / pág.</option>)}
                  </select>
                  <Button variant="outline" disabled={reportePage === 0} onClick={() => setReportePage((actual) => actual - 1)}>Anterior</Button>
                  <Button variant="outline" disabled={(reportePage + 1) * reportePageSize >= reporteTotal} onClick={() => setReportePage((actual) => actual + 1)}>Siguiente</Button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
