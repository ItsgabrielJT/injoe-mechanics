"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { Car, ChevronDown, ChevronRight, Eye, FileText, Search } from "lucide-react";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";
import { obtenerEmpresa } from "@/modules/configuracion/infrastructure/configuracion-api";
import {
  VACIO_TOTALES,
  fechaCorta,
  type EstadoVehiculo,
  type FiltrosEstadoVehiculo,
  type OrdenEstado,
  type TotalesEstadoVehiculo,
} from "@/modules/estado-vehiculo/domain/entities";
import {
  listarEstadoVehiculo,
  listarEstadoVehiculoReporte,
  obtenerHistorialVehiculo,
} from "@/modules/estado-vehiculo/infrastructure/estado-vehiculo-api";
import { formatoMoneda, type OrdenTrabajo } from "@/modules/ordenes-trabajo/domain/entities";
import { obtenerOrden } from "@/modules/ordenes-trabajo/infrastructure/ordenes-api";
import { OrdenDetalleDialog } from "@/modules/ordenes-trabajo/presentation/modals/orden-detalle-dialog";
import { MuiDataTable } from "@/shared/components/MuiDataTable";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ApiError } from "@/shared/infrastructure/http/http-error";

const FILTROS_VACIOS: FiltrosEstadoVehiculo = {
  placa: "",
  marca: "",
  modelo: "",
  cliente: "",
  identificacion: "",
  fecha_desde: "",
  fecha_hasta: "",
};

function limpiar(filtros: FiltrosEstadoVehiculo): FiltrosEstadoVehiculo {
  return {
    placa: filtros.placa?.trim() || undefined,
    marca: filtros.marca?.trim() || undefined,
    modelo: filtros.modelo?.trim() || undefined,
    cliente: filtros.cliente?.trim() || undefined,
    identificacion: filtros.identificacion?.trim() || undefined,
    fecha_desde: filtros.fecha_desde || undefined,
    fecha_hasta: filtros.fecha_hasta || undefined,
  };
}

function textoFiltros(filtros: FiltrosEstadoVehiculo): string {
  const limpio = limpiar(filtros);
  const partes = [
    limpio.placa && `Placa: ${limpio.placa}`,
    limpio.marca && `Marca: ${limpio.marca}`,
    limpio.modelo && `Modelo: ${limpio.modelo}`,
    limpio.cliente && `Cliente: ${limpio.cliente}`,
    limpio.identificacion && `Cédula: ${limpio.identificacion}`,
    limpio.fecha_desde && `Desde: ${limpio.fecha_desde}`,
    limpio.fecha_hasta && `Hasta: ${limpio.fecha_hasta}`,
  ].filter(Boolean);
  return partes.length ? partes.join(" · ") : "Todos los vehículos trabajados";
}

export function EstadoVehiculoPage() {
  const { sesion, puntoActivo } = useSesionContext();
  const token = sesion?.accessToken ?? "";
  const [rows, setRows] = useState<EstadoVehiculo[]>([]);
  const [total, setTotal] = useState(0);
  const [totales, setTotales] = useState<TotalesEstadoVehiculo>(VACIO_TOTALES);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filtros, setFiltros] = useState<FiltrosEstadoVehiculo>(FILTROS_VACIOS);
  const [debounced, setDebounced] = useState<FiltrosEstadoVehiculo>(FILTROS_VACIOS);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<OrdenTrabajo | null>(null);
  const [reporteUrl, setReporteUrl] = useState<string | null>(null);
  const [reporteTitulo, setReporteTitulo] = useState("Reporte de vehículos");
  const [reporteNombre, setReporteNombre] = useState("reporte-estado-vehiculo.pdf");
  const [generando, setGenerando] = useState(false);
  const [empresaNombre, setEmpresaNombre] = useState("INJOE");
  const [expandidoId, setExpandidoId] = useState<number | null>(null);
  const [filtroOrden, setFiltroOrden] = useState("");
  const [debouncedOrden, setDebouncedOrden] = useState("");
  const [pageOrdenes, setPageOrdenes] = useState(0);
  const [pageSizeOrdenes, setPageSizeOrdenes] = useState(10);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(filtros), 400);
    return () => clearTimeout(timer);
  }, [filtros]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedOrden(filtroOrden), 400);
    return () => clearTimeout(timer);
  }, [filtroOrden]);

  const query = useMemo(() => limpiar(debounced), [debounced]);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const resp = await listarEstadoVehiculo(token, { ...query, page: page + 1, size: pageSize });
      setRows(resp.data);
      setTotal(resp.total);
      setTotales(resp.totales);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar el estado de vehículo");
    } finally {
      setCargando(false);
    }
  }, [page, pageSize, query, token]);

  useEffect(() => {
    void cargar();
  }, [cargar, puntoActivo?.id]);

  useEffect(() => {
    setPage(0);
  }, [query.placa, query.marca, query.modelo, query.cliente, query.identificacion, query.fecha_desde, query.fecha_hasta]);

  useEffect(() => {
    if (!token) return;
    void obtenerEmpresa(token).then((empresa) => setEmpresaNombre(empresa.nombre)).catch(() => undefined);
  }, [token]);

  useEffect(() => {
    return () => {
      if (reporteUrl) URL.revokeObjectURL(reporteUrl);
    };
  }, [reporteUrl]);

  function actualizar(campo: keyof FiltrosEstadoVehiculo, valor: string) {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  }

  async function abrirDetalle(orden: OrdenEstado) {
    try {
      setDetalle(await obtenerOrden(token, orden.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo abrir el detalle");
    }
  }

  async function mostrarBlob(blob: Blob, titulo: string, nombre: string) {
    if (reporteUrl) URL.revokeObjectURL(reporteUrl);
    setReporteTitulo(titulo);
    setReporteNombre(nombre);
    setReporteUrl(URL.createObjectURL(blob));
  }

  async function abrirReporteListado() {
    setGenerando(true);
    try {
      const { data, totales: tot } = await listarEstadoVehiculoReporte(token, query);
      const { blobReporteEstadoVehiculo } = await import(
        "@/modules/estado-vehiculo/presentation/pdf/estado-vehiculo-reporte-pdf"
      );
      const blob = await blobReporteEstadoVehiculo({
        vehiculos: data,
        totales: tot,
        empresa: empresaNombre,
        filtros: textoFiltros(debounced),
      });
      await mostrarBlob(blob, "Reporte de vehículos", "reporte-estado-vehiculo.pdf");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo generar el reporte");
    } finally {
      setGenerando(false);
    }
  }

  async function abrirHistorial(vehiculo: EstadoVehiculo) {
    setGenerando(true);
    try {
      const historial = await obtenerHistorialVehiculo(token, vehiculo.vehiculoId, {
        fecha_desde: query.fecha_desde,
        fecha_hasta: query.fecha_hasta,
      });
      const { blobHistorialVehiculo } = await import(
        "@/modules/estado-vehiculo/presentation/pdf/estado-vehiculo-historial-pdf"
      );
      const blob = await blobHistorialVehiculo({
        historial,
        empresa: empresaNombre,
        filtros: textoFiltros(debounced),
      });
      await mostrarBlob(blob, `Historial ${vehiculo.placa}`, `historial-${vehiculo.placa}.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo generar el historial");
    } finally {
      setGenerando(false);
    }
  }

  const columns = useMemo<GridColDef[]>(() => [
    { field: "placa", headerName: "Placa", minWidth: 110, flex: 0.6 },
    { field: "marca", headerName: "Marca", minWidth: 120, flex: 0.7, valueGetter: (_v, row) => row.marca || "—" },
    { field: "modelo", headerName: "Modelo", minWidth: 120, flex: 0.7, valueGetter: (_v, row) => row.modelo || "—" },
    { field: "clienteNombres", headerName: "Cliente", minWidth: 160, flex: 1 },
    { field: "clienteIdentificacion", headerName: "Cédula", minWidth: 120, flex: 0.7, valueGetter: (_v, row) => row.clienteIdentificacion || "—" },
    { field: "ordenesCount", headerName: "OT", minWidth: 70, type: "number" },
    { field: "ultimaFecha", headerName: "Última OT", minWidth: 150, valueGetter: (_v, row) => fechaCorta(row.ultimaFecha) },
    { field: "totalCosto", headerName: "Costo", minWidth: 110, type: "number", valueFormatter: (value) => formatoMoneda(Number(value ?? 0)) },
    { field: "totalUtilidad", headerName: "Utilidad", minWidth: 110, type: "number", valueFormatter: (value) => formatoMoneda(Number(value ?? 0)) },
    { field: "total", headerName: "Total", minWidth: 110, type: "number", valueFormatter: (value) => formatoMoneda(Number(value ?? 0)) },
    {
      field: "acciones",
      headerName: "Acciones",
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            title={expandidoId === row.vehiculoId ? "Ocultar órdenes" : "Ver órdenes"}
            onClick={() => {
              setExpandidoId((actual) => (actual === row.vehiculoId ? null : row.vehiculoId));
              setFiltroOrden("");
              setDebouncedOrden("");
              setPageOrdenes(0);
            }}
          >
            {expandidoId === row.vehiculoId ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" title="Historial PDF" disabled={generando} onClick={() => void abrirHistorial(row)}>
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [expandidoId, generando, query.fecha_desde, query.fecha_hasta, token]);

  const expandido = rows.find((row) => row.vehiculoId === expandidoId) ?? null;
  const ordenesFiltradas = useMemo(() => {
    const termino = debouncedOrden.trim().toLowerCase();
    if (!expandido) return [];
    if (!termino) return expandido.ordenes;
    return expandido.ordenes.filter((orden) => orden.numero.toLowerCase().includes(termino));
  }, [debouncedOrden, expandido]);

  useEffect(() => {
    setPageOrdenes(0);
  }, [debouncedOrden, expandidoId]);

  const columnasOrdenes = useMemo<GridColDef[]>(() => [
    { field: "numero", headerName: "Número", minWidth: 120, flex: 0.7 },
    {
      field: "estado",
      headerName: "Estado",
      minWidth: 130,
      flex: 0.7,
      valueGetter: (_v, row) => (row.estado === "CERRADA" ? "Cerrada" : "En proceso"),
    },
    { field: "tecnicoNombre", headerName: "Técnico", minWidth: 160, flex: 1, valueGetter: (_v, row) => row.tecnicoNombre || "—" },
    { field: "fechaInicio", headerName: "Inicio", minWidth: 150, valueGetter: (_v, row) => fechaCorta(row.fechaInicio) },
    { field: "fechaEntrega", headerName: "Entrega", minWidth: 150, valueGetter: (_v, row) => fechaCorta(row.fechaEntrega) },
    { field: "totalCosto", headerName: "Costo", minWidth: 110, type: "number", valueFormatter: (value) => formatoMoneda(Number(value ?? 0)) },
    { field: "totalUtilidad", headerName: "Utilidad", minWidth: 110, type: "number", valueFormatter: (value) => formatoMoneda(Number(value ?? 0)) },
    { field: "total", headerName: "Total", minWidth: 110, type: "number", valueFormatter: (value) => formatoMoneda(Number(value ?? 0)) },
    {
      field: "acciones",
      headerName: "Detalle",
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Button size="icon" variant="ghost" title="Ver detalle" onClick={() => void abrirDetalle(row)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ], [token]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold inline-flex items-center gap-2"><Car className="h-6 w-6" /> Estado de vehículo</h1>
          <p className="text-sm text-muted-foreground">Historial de vehículos trabajados, órdenes y reportes.</p>
        </div>
        <Button variant="outline" disabled={generando} onClick={() => void abrirReporteListado()}>
          <FileText className="mr-2 h-4 w-4" /> {generando ? "Generando..." : "Reporte PDF"}
        </Button>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={filtros.placa ?? ""} onChange={(e) => actualizar("placa", e.target.value)} placeholder="Placa" className="pl-10" />
        </div>
        <Input value={filtros.marca ?? ""} onChange={(e) => actualizar("marca", e.target.value)} placeholder="Marca" />
        <Input value={filtros.modelo ?? ""} onChange={(e) => actualizar("modelo", e.target.value)} placeholder="Modelo" />
        <Input value={filtros.cliente ?? ""} onChange={(e) => actualizar("cliente", e.target.value)} placeholder="Cliente" />
        <Input value={filtros.identificacion ?? ""} onChange={(e) => actualizar("identificacion", e.target.value)} placeholder="Cédula / RUC" />
        <Input type="date" value={filtros.fecha_desde ?? ""} onChange={(e) => actualizar("fecha_desde", e.target.value)} />
        <Input type="date" value={filtros.fecha_hasta ?? ""} onChange={(e) => actualizar("fecha_hasta", e.target.value)} />
      </div>

      <MuiDataTable
        rows={rows}
        columns={columns}
        loading={cargando}
        getRowId={(row) => row.vehiculoId}
        page={page}
        pageSize={pageSize}
        rowCount={total}
        paginationMode="server"
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        storageKey="mecanicos.estado-vehiculo.columnas"
        showToolbar
        footerTotalFields={["ordenesCount", "totalCosto", "totalUtilidad", "total"]}
        footerTotalLabel="Total general"
        footerTotalValues={{
          ordenesCount: totales.ordenes,
          totalCosto: totales.totalCosto,
          totalUtilidad: totales.totalUtilidad,
          total: totales.total,
        }}
      />

      {expandido && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold">Órdenes de {expandido.placa} · {expandido.clienteNombres}</h2>
            <Button variant="outline" disabled={generando} onClick={() => void abrirHistorial(expandido)}>
              <FileText className="mr-2 h-4 w-4" /> Historial PDF
            </Button>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={filtroOrden}
              onChange={(e) => setFiltroOrden(e.target.value)}
              placeholder="Buscar número de orden"
              className="pl-10"
            />
          </div>
          <MuiDataTable
            rows={ordenesFiltradas}
            columns={columnasOrdenes}
            getRowId={(row) => row.id}
            page={pageOrdenes}
            pageSize={pageSizeOrdenes}
            rowCount={ordenesFiltradas.length}
            paginationMode="client"
            onPageChange={setPageOrdenes}
            onPageSizeChange={(size) => { setPageSizeOrdenes(size); setPageOrdenes(0); }}
            storageKey="mecanicos.estado-vehiculo.ordenes.columnas"
            showToolbar
            className="!h-[min(46dvh,480px)]"
            footerTotalFields={["totalCosto", "totalUtilidad", "total"]}
            footerTotalLabel="Totales"
          />
        </div>
      )}

      <OrdenDetalleDialog detalle={detalle} soloLectura onClose={() => setDetalle(null)} />

      {reporteUrl && (
        <Portal>
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setReporteUrl(null)} />
            <div className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-card shadow-elegant">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <h2 className="text-lg font-semibold">{reporteTitulo}</h2>
                <div className="flex gap-2">
                  <Button onClick={() => {
                    const a = document.createElement("a");
                    a.href = reporteUrl;
                    a.download = reporteNombre;
                    a.click();
                  }}>Descargar PDF</Button>
                  <Button variant="outline" onClick={() => setReporteUrl(null)}>Cerrar</Button>
                </div>
              </div>
              <iframe title={reporteTitulo} src={reporteUrl} className="h-full w-full bg-white" />
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
