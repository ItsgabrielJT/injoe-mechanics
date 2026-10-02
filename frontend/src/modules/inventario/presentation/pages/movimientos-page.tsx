"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { ArrowLeftRight, Eye, FileText, Plus } from "lucide-react";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";
import {
  TIPOS_MOVIMIENTO,
  etiquetaMovimiento,
  formatoCantidad,
  formatoFecha,
  resumenProductosMovimiento,
  type Bodega,
  type MovimientoInventario,
  type Producto,
  type TipoMovimiento,
} from "@/modules/inventario/domain/entities";
import { descargarElementoComoPdf } from "@/modules/inventario/infrastructure/descargar-pdf";
import {
  listarBodegas,
  listarMovimientos,
  listarProductos,
  registrarMovimiento,
  reporteMovimientos,
} from "@/modules/inventario/infrastructure/inventario-api";
import { BuscadorMultiple } from "@/modules/inventario/presentation/components/buscador-select";
import { AjusteFormDrawer, type AjusteFormValues } from "@/modules/inventario/presentation/forms/ajuste-form-drawer";
import { MovimientoFormDrawer, type MovimientoFormValues } from "@/modules/inventario/presentation/forms/movimiento-form-drawer";
import { MuiDataTable } from "@/shared/components/MuiDataTable";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ApiError } from "@/shared/infrastructure/http/http-error";

type Periodo = "mes" | "trimestre" | "semestre" | "anio" | "rango";

function rangoPeriodo(periodo: Periodo, desde?: string, hasta?: string): { fecha_desde?: string; fecha_hasta?: string } {
  const ahora = new Date();
  const fin = new Date(ahora);
  fin.setHours(23, 59, 59, 999);
  const inicio = new Date(ahora);
  inicio.setHours(0, 0, 0, 0);
  if (periodo === "mes") inicio.setDate(1);
  if (periodo === "trimestre") inicio.setMonth(Math.floor(inicio.getMonth() / 3) * 3, 1);
  if (periodo === "semestre") inicio.setMonth(inicio.getMonth() < 6 ? 0 : 6, 1);
  if (periodo === "anio") inicio.setMonth(0, 1);
  if (periodo === "rango") {
    return {
      fecha_desde: desde ? new Date(`${desde}T00:00:00`).toISOString() : undefined,
      fecha_hasta: hasta ? new Date(`${hasta}T23:59:59`).toISOString() : undefined,
    };
  }
  return { fecha_desde: inicio.toISOString(), fecha_hasta: fin.toISOString() };
}

export function MovimientosPage() {
  const { sesion, puntoActivo } = useSesionContext();
  const token = sesion?.accessToken ?? "";
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoIds, setProductoIds] = useState<number[]>([]);
  const [bodegaIds, setBodegaIds] = useState<number[]>([]);
  const [tipo, setTipo] = useState<string>("all");
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [drawerMov, setDrawerMov] = useState(false);
  const [drawerAjuste, setDrawerAjuste] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [detalle, setDetalle] = useState<MovimientoInventario | null>(null);
  const [reporte, setReporte] = useState<MovimientoInventario[] | null>(null);
  const [exportando, setExportando] = useState(false);
  const reporteRef = useRef<HTMLDivElement>(null);

  const filtros = useCallback(() => {
    const fechas = rangoPeriodo(periodo, desde, hasta);
    return {
      page: page + 1,
      size: pageSize,
      producto_ids: productoIds.length ? productoIds : undefined,
      bodega_ids: bodegaIds.length ? bodegaIds : undefined,
      tipo: tipo === "all" ? undefined : (tipo as TipoMovimiento),
      ...fechas,
    };
  }, [bodegaIds, desde, hasta, page, pageSize, periodo, productoIds, tipo]);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const respuesta = await listarMovimientos(token, filtros());
      setMovimientos(respuesta.data);
      setTotal(respuesta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar los movimientos");
    } finally {
      setCargando(false);
    }
  }, [filtros, token]);

  useEffect(() => {
    if (!token) return;
    void Promise.all([
      listarBodegas(token, { page: 1, size: 200, activo: true }),
      listarProductos(token, { page: 1, size: 200, activo: true }),
    ]).then(([b, p]) => {
      setBodegas(b.data);
      setProductos(p.data);
    });
  }, [token, puntoActivo?.id]);

  useEffect(() => {
    void cargar();
  }, [cargar, puntoActivo?.id]);

  useEffect(() => {
    setPage(0);
  }, [productoIds, bodegaIds, tipo, periodo, desde, hasta]);

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: "codigo", headerName: "Lote", minWidth: 120 },
      { field: "tipo", headerName: "Tipo", minWidth: 130, valueGetter: (value) => etiquetaMovimiento(value) },
      { field: "bodegaNombre", headerName: "Bodega", minWidth: 140, valueGetter: (_v, row) => {
        const mov = row as MovimientoInventario;
        return mov.bodegaDestinoNombre ? `${mov.bodegaNombre} → ${mov.bodegaDestinoNombre}` : mov.bodegaNombre;
      } },
      {
        field: "lineas",
        headerName: "Productos",
        minWidth: 240,
        flex: 1.2,
        sortable: false,
        valueGetter: (value: MovimientoInventario["lineas"]) => resumenProductosMovimiento(value ?? []),
        renderCell: (params) => {
          const mov = params.row as MovimientoInventario;
          const completo = mov.lineas.map((linea) => linea.productoNombre || linea.productoCodigo).filter(Boolean).join(", ");
          return (
            <button
              type="button"
              title={completo}
              className="w-full truncate text-left text-primary hover:underline"
              onClick={() => setDetalle(mov)}
            >
              {resumenProductosMovimiento(mov.lineas)}
            </button>
          );
        },
      },
      { field: "creadoEn", headerName: "Fecha", minWidth: 150, valueGetter: (value) => formatoFecha(value) },
      { field: "nota", headerName: "Nota", minWidth: 160, valueGetter: (value) => value || "—" },
      {
        field: "acciones",
        headerName: "Detalle",
        minWidth: 90,
        sortable: false,
        renderCell: (params) => (
          <Button variant="ghost" size="icon" onClick={() => setDetalle(params.row as MovimientoInventario)}>
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [],
  );

  async function guardarMovimiento(values: MovimientoFormValues) {
    setGuardando(true);
    setError(null);
    try {
      await registrarMovimiento(token, {
        tipo: values.tipo,
        bodega_id: values.bodega_id,
        bodega_destino_id: values.tipo === "TRANSFERENCIA" ? values.bodega_destino_id : null,
        nota: values.nota || null,
        observacion: values.observacion || null,
        items: values.items,
      });
      setDrawerMov(false);
      setExito("Movimiento registrado");
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el movimiento");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarAjuste(values: AjusteFormValues) {
    setGuardando(true);
    setError(null);
    try {
      await registrarMovimiento(token, {
        tipo: "AJUSTE",
        bodega_id: values.bodega_id,
        tipo_ajuste: values.tipo_ajuste,
        nota: values.nota || null,
        items: values.items,
      });
      setDrawerAjuste(false);
      setExito("Ajuste registrado");
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el ajuste");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-4 sm:space-y-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-7 w-7 text-primary" /> Movimientos de stock
          </h1>
          <p className="text-sm text-muted-foreground">Los productos de un mismo registro comparten un código de lote.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={async () => setReporte(await reporteMovimientos(token, filtros()))}>
            <FileText className="h-4 w-4 mr-2" /> Reporte
          </Button>
          <Button variant="outline" onClick={() => setDrawerAjuste(true)}>Ajuste</Button>
          <Button onClick={() => setDrawerMov(true)}><Plus className="h-4 w-4 mr-2" /> Nuevo movimiento</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Productos</p>
          <BuscadorMultiple
            opciones={productos.map((item) => ({ id: item.id, label: `${item.codigo} · ${item.nombre}`, extra: item.codigoBarras ?? undefined }))}
            valores={productoIds}
            onChange={setProductoIds}
            placeholder="Buscar código, nombre o barras"
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Bodegas</p>
          <BuscadorMultiple
            opciones={bodegas.map((item) => ({ id: item.id, label: item.nombre }))}
            valores={bodegaIds}
            onChange={setBodegaIds}
            placeholder="Buscar bodega"
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Tipo</p>
          <select className="flex h-10 w-full rounded-md border border-input px-3 text-sm bg-background" value={tipo} onChange={(event) => setTipo(event.target.value)}>
            <option value="all">Todos</option>
            {TIPOS_MOVIMIENTO.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Periodo</p>
          <select className="flex h-10 w-full rounded-md border border-input px-3 text-sm bg-background" value={periodo} onChange={(event) => setPeriodo(event.target.value as Periodo)}>
            <option value="mes">Mensual</option>
            <option value="trimestre">Trimestral</option>
            <option value="semestre">Semestral</option>
            <option value="anio">Anual</option>
            <option value="rango">Fechas específicas</option>
          </select>
        </div>
      </div>
      {periodo === "rango" && (
        <div className="flex gap-2">
          <Input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
          <Input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
        </div>
      )}

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {exito && <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">{exito}</div>}

      <MuiDataTable
        rows={movimientos}
        columns={columns}
        loading={cargando}
        page={page}
        pageSize={pageSize}
        rowCount={total}
        paginationMode="server"
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        storageKey="mecanicos.movimientos.columnas"
        showToolbar
      />

      <MovimientoFormDrawer abierto={drawerMov} bodegas={bodegas} productos={productos} cargando={guardando} onClose={() => setDrawerMov(false)} onSubmit={guardarMovimiento} />
      <AjusteFormDrawer abierto={drawerAjuste} bodegas={bodegas} productos={productos} cargando={guardando} onClose={() => setDrawerAjuste(false)} onSubmit={guardarAjuste} />

      {detalle && (
        <Portal>
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDetalle(null)} />
            <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-card p-6 shadow-elegant">
              <div className="flex justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Detalle del movimiento</h2>
                  <p className="text-sm text-muted-foreground">Lote {detalle.codigo} · {etiquetaMovimiento(detalle.tipo)}</p>
                </div>
                <Button variant="ghost" onClick={() => setDetalle(null)}>Cerrar</Button>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div><dt className="text-muted-foreground">Fecha</dt><dd>{formatoFecha(detalle.creadoEn)}</dd></div>
                <div><dt className="text-muted-foreground">Bodega</dt><dd>{detalle.bodegaNombre}</dd></div>
                {detalle.bodegaDestinoNombre && <div><dt className="text-muted-foreground">Destino</dt><dd>{detalle.bodegaDestinoNombre}</dd></div>}
                {detalle.tipoAjuste && <div><dt className="text-muted-foreground">Ajuste</dt><dd>{detalle.tipoAjuste}</dd></div>}
                {detalle.nota && <div className="col-span-2"><dt className="text-muted-foreground">Nota</dt><dd>{detalle.nota}</dd></div>}
                {detalle.observacion && <div className="col-span-2"><dt className="text-muted-foreground">Observación</dt><dd>{detalle.observacion}</dd></div>}
              </dl>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground"><th className="py-1">Producto</th><th>Cantidad</th><th>Stock origen</th><th>Stock destino</th></tr></thead>
                <tbody>
                  {detalle.lineas.map((linea) => (
                    <tr key={linea.productoId} className="border-t">
                      <td className="py-1">{linea.productoCodigo} · {linea.productoNombre}</td>
                      <td>{formatoCantidad(linea.cantidad)}</td>
                      <td>{formatoCantidad(linea.stockOrigenDespues)}</td>
                      <td>{linea.stockDestinoDespues != null ? formatoCantidad(linea.stockDestinoDespues) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Portal>
      )}

      {reporte && (
        <Portal>
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setReporte(null)} />
            <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 text-black">
              <div className="flex justify-between mb-4">
                <h2 className="text-lg font-semibold">Reporte de movimientos</h2>
                <div className="flex gap-2">
                  <Button
                    disabled={exportando}
                    onClick={async () => {
                      if (!reporteRef.current) return;
                      setExportando(true);
                      try {
                        await descargarElementoComoPdf(reporteRef.current, `movimientos-${puntoActivo?.nombre ?? "reporte"}`);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "No se pudo generar el PDF");
                      } finally {
                        setExportando(false);
                      }
                    }}
                  >
                    {exportando ? "Generando PDF..." : "Descargar PDF"}
                  </Button>
                  <Button variant="outline" onClick={() => setReporte(null)}>Cerrar</Button>
                </div>
              </div>
              <div ref={reporteRef} className="bg-white text-black">
                <h1 className="text-xl font-bold">Movimientos de stock</h1>
                <p className="text-sm mb-4">{new Date().toLocaleString("es-EC")}</p>
                {reporte.map((mov) => (
                  <section key={mov.id} className="mb-5">
                    <h3 className="font-semibold">{mov.codigo} · {etiquetaMovimiento(mov.tipo)} · {formatoFecha(mov.creadoEn)}</h3>
                    <p className="text-sm">{mov.bodegaDestinoNombre ? `${mov.bodegaNombre} → ${mov.bodegaDestinoNombre}` : mov.bodegaNombre}{mov.nota ? ` · ${mov.nota}` : ""}</p>
                    <table className="mt-2 w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-1">Producto</th>
                          <th>Cant.</th>
                          <th>Stock origen</th>
                          <th>Stock destino</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mov.lineas.map((linea) => (
                          <tr key={linea.productoId} className="border-b">
                            <td className="py-1">{linea.productoCodigo} · {linea.productoNombre}</td>
                            <td>{formatoCantidad(linea.cantidad)}</td>
                            <td>{formatoCantidad(linea.stockOrigenDespues)}</td>
                            <td>{linea.stockDestinoDespues != null ? formatoCantidad(linea.stockDestinoDespues) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
