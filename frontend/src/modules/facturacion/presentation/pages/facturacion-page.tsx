"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { Ban, BarChart3, FileText, Loader2, Plus, Search, Send, Trash2 } from "lucide-react";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";
import { listarClientes } from "@/modules/clientes/infrastructure/clientes-api";
import type { Cliente } from "@/modules/clientes/domain/entities";
import { listarBodegas, listarExistencias, listarProductos } from "@/modules/inventario/infrastructure/inventario-api";
import type { Bodega, Existencia, Producto } from "@/modules/inventario/domain/entities";
import { listarServicios } from "@/modules/servicios/infrastructure/servicios-api";
import type { Servicio } from "@/modules/servicios/domain/entities";
import { obtenerEmpresa } from "@/modules/configuracion/infrastructure/configuracion-api";
import {
  etiquetaEstado,
  mensajeErrorSri,
  nombreCliente,
  type EstadoFactura,
  type Factura,
  type FacturaInput,
  type FormaPago,
  type TotalesFactura,
} from "@/modules/facturacion/domain/entities";
import {
  cancelarFactura,
  eliminarFactura,
  enviarSri,
  guardarFactura,
  listarFacturas,
  listarFacturasReporte,
  listarFormasPago,
  obtenerFactura,
} from "@/modules/facturacion/infrastructure/facturacion-api";
import { ChipEstado } from "@/modules/facturacion/presentation/components/chip-estado";
import { FacturaFormDrawer } from "@/modules/facturacion/presentation/forms/factura-form-drawer";
import { FacturaDetalleDialog } from "@/modules/facturacion/presentation/modals/factura-detalle-dialog";
import { FacturacionEstadisticas } from "@/modules/facturacion/presentation/pages/facturacion-estadisticas";
import { blobReporteFacturas } from "@/modules/facturacion/presentation/pdf/factura-reporte-pdf";
import { descargarPdfFactura } from "@/modules/facturacion/presentation/pdf/invoice-pdf";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { MuiDataTable } from "@/shared/components/MuiDataTable";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ApiError } from "@/shared/infrastructure/http/http-error";

const VACIO_TOTALES: TotalesFactura = { cantidad: 0, subtotal: 0, iva15: 0, iva5: 0, iva0: 0, total: 0 };

function dinero(valor: number): string {
  return Number(valor ?? 0).toFixed(2);
}

export function FacturacionPage() {
  const { sesion, puntoActivo } = useSesionContext();
  const token = sesion?.accessToken ?? "";
  const [pestana, setPestana] = useState<"facturas" | "estadisticas">("facturas");
  const [rows, setRows] = useState<Factura[]>([]);
  const [total, setTotal] = useState(0);
  const [totales, setTotales] = useState<TotalesFactura>(VACIO_TOTALES);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [estado, setEstado] = useState<"" | EstadoFactura>("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [enviandoId, setEnviandoId] = useState<number | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [edicion, setEdicion] = useState<Factura | null>(null);
  const [eliminar, setEliminar] = useState<Factura | null>(null);
  const [cancelar, setCancelar] = useState<Factura | null>(null);
  const [detalle, setDetalle] = useState<Factura | null>(null);
  const [reporteUrl, setReporteUrl] = useState<string | null>(null);
  const [generandoReporte, setGenerandoReporte] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [formas, setFormas] = useState<FormaPago[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [existencias, setExistencias] = useState<Record<number, Existencia[]>>({});
  const existenciasRef = useRef<Record<number, Existencia[]>>({});
  existenciasRef.current = existencias;
  const [empresa, setEmpresa] = useState({
    nombre: "INJOE",
    ruc: "",
    direccion: "",
    direccionSucursal: "",
    telefono: "",
    correo: "",
    entornoSri: "1",
    logoUrl: null as string | null,
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const filtros = useMemo(() => ({
    search: debounced || undefined,
    estado: estado || undefined,
  }), [debounced, estado]);

  const cargar = useCallback(async (opciones?: { silencioso?: boolean }) => {
    if (!token) return;
    if (!opciones?.silencioso) setCargando(true);
    try {
      const lista = await listarFacturas(token, { page: page + 1, size: pageSize, ...filtros });
      setRows(lista.data);
      setTotal(lista.total);
      setTotales(lista.totales);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar las facturas");
    } finally {
      setCargando(false);
    }
  }, [token, page, pageSize, filtros]);

  const cargarCatalogos = useCallback(async () => {
    if (!token) return;
    const [cli, prods, servs, fps, emp, bds] = await Promise.all([
      listarClientes(token, { page: 1, size: 100 }),
      listarProductos(token, { page: 1, size: 100, activo: true }),
      listarServicios(token, { page: 1, size: 100, activo: true }),
      listarFormasPago(token),
      obtenerEmpresa(token),
      listarBodegas(token, { page: 1, size: 100, activo: true }),
    ]);
    setClientes(cli.data);
    setProductos(prods.data);
    setServicios(servs.data);
    setFormas(fps);
    setBodegas(bds.data);
    setEmpresa({
      nombre: emp.nombre,
      ruc: emp.ruc,
      direccion: emp.direccion,
      direccionSucursal: puntoActivo?.direccion || emp.direccion,
      telefono: emp.telefono ?? "",
      correo: emp.correo ?? "",
      entornoSri: emp.entornoSri,
      logoUrl: emp.rutaLogo,
    });
  }, [token, puntoActivo?.direccion]);

  const cargarExistencias = useCallback(async (productoId: number) => {
    if (!token) return [];
    if (existenciasRef.current[productoId]) return existenciasRef.current[productoId];
    const filas = await listarExistencias(token, productoId);
    setExistencias((prev) => {
      const next = { ...prev, [productoId]: filas };
      existenciasRef.current = next;
      return next;
    });
    return filas;
  }, [token]);

  useEffect(() => { void cargar(); }, [cargar, puntoActivo?.id]);
  useEffect(() => { void cargarCatalogos(); }, [cargarCatalogos, puntoActivo?.id]);
  useEffect(() => () => { if (reporteUrl) URL.revokeObjectURL(reporteUrl); }, [reporteUrl]);

  async function abrirDetalle(row: Factura) {
    try {
      setDetalle(await obtenerFactura(token, row.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo abrir el detalle");
    }
  }

  const columns = useMemo<GridColDef[]>(() => [
    {
      field: "numero",
      headerName: "Número",
      minWidth: 170,
      flex: 0.8,
      renderCell: ({ row }) => (
        <button
          type="button"
          className="text-left font-medium text-primary hover:underline"
          onClick={(event) => {
            event.stopPropagation();
            void abrirDetalle(row);
          }}
        >
          {row.numero}
        </button>
      ),
    },
    { field: "clienteNombres", headerName: "Cliente", minWidth: 170, flex: 1, valueGetter: (_v, row) => nombreCliente(row) },
    { field: "clienteIdentificacion", headerName: "Identificación", minWidth: 130, valueGetter: (_v, row) => row.tipoReceptor === "consumidor_final" ? "9999999999999" : row.clienteIdentificacion || "—" },
    {
      field: "estado",
      headerName: "Estado",
      minWidth: 160,
      valueGetter: (_v, row) => etiquetaEstado(row.estado),
      renderCell: ({ row }) => <ChipEstado estado={row.estado} enviando={enviandoId === row.id} />,
    },
    { field: "fechaEmision", headerName: "Emisión", minWidth: 110 },
    { field: "formaPagoNombre", headerName: "Forma de pago", minWidth: 140, valueGetter: (_v, row) => row.formaPagoNombre || "—" },
    { field: "subtotal", headerName: "Subtotal", minWidth: 110, type: "number", valueFormatter: (value) => dinero(Number(value)) },
    { field: "iva15", headerName: "IVA 15%", minWidth: 100, type: "number", valueFormatter: (value) => dinero(Number(value)) },
    { field: "iva5", headerName: "IVA 5%", minWidth: 90, type: "number", valueFormatter: (value) => dinero(Number(value)) },
    { field: "iva0", headerName: "IVA 0%", minWidth: 90, type: "number", valueFormatter: (value) => dinero(Number(value)) },
    { field: "total", headerName: "Total", minWidth: 110, type: "number", valueFormatter: (value) => dinero(Number(value)) },
    {
      field: "acciones",
      headerName: "",
      width: 230,
      sortable: false,
      renderCell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" title="Detalle" onClick={() => void abrirDetalle(row)}><Search className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" title="PDF" onClick={() => void descargarPdfFactura(row, empresa)}><FileText className="h-4 w-4" /></Button>
          {(row.estado === "BORRADOR" || row.estado === "RECHAZADA") && (
            <Button size="sm" variant="outline" onClick={() => { setEdicion(row); setDrawer(true); }}>Editar</Button>
          )}
          {row.estado === "BORRADOR" && (
            <>
              <Button size="icon" variant="ghost" title="Enviar SRI" disabled={enviandoId === row.id} onClick={() => void enviar(row)}>
                {enviandoId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" title="Eliminar" disabled={enviandoId === row.id} onClick={() => setEliminar(row)}><Trash2 className="h-4 w-4" /></Button>
            </>
          )}
          {["RECHAZADA", "PENDIENTE_AUTORIZACION"].includes(row.estado) && (
            <Button size="sm" variant="outline" disabled={enviandoId === row.id} onClick={() => void enviar(row)}>
              {enviandoId === row.id ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Enviando</> : "Reenviar"}
            </Button>
          )}
          {row.estado !== "CANCELADA" && row.estado !== "ENVIADA" && (
            <Button size="icon" variant="ghost" title="Cancelar factura" onClick={() => setCancelar(row)}><Ban className="h-4 w-4 text-destructive" /></Button>
          )}
        </div>
      ),
    },
  ], [empresa, enviandoId, token]);

  async function guardar(body: FacturaInput) {
    setGuardando(true);
    try {
      await guardarFactura(token, body, edicion?.id);
      setDrawer(false);
      setEdicion(null);
      setExito("Factura guardada");
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function enviar(row: Factura) {
    setError(null);
    setEnviandoId(row.id);
    setExito(`Enviando ${row.numero} al SRI. El sistema actualizará el estado enseguida.`);
    setRows((prev) => prev.map((factura) => (factura.id === row.id ? { ...factura, estado: "ENVIADA" } : factura)));
    try {
      const actualizada = await enviarSri(token, row.id);
      if (actualizada.estado === "AUTORIZADA") {
        setExito(`Factura ${row.numero} enviada. El SRI ya la autorizó.`);
      } else if (actualizada.estado === "PENDIENTE_AUTORIZACION" || actualizada.estado === "ENVIADA") {
        setExito(`Factura ${row.numero} enviada. El SRI la recibió y el sistema actualizará el estado al autorizarla.`);
      } else if (actualizada.estado === "RECHAZADA") {
        setError(mensajeErrorSri(actualizada.reasonError) || "El SRI rechazó la factura.");
        setExito(null);
      } else {
        setExito(`Factura ${row.numero} enviada. Estado: ${etiquetaEstado(actualizada.estado)}.`);
      }
      await cargar({ silencioso: true });
    } catch (err) {
      setExito(null);
      setError(err instanceof ApiError ? err.message : "No se pudo enviar al SRI");
      await cargar({ silencioso: true });
    } finally {
      setEnviandoId(null);
    }
  }

  async function abrirReporte() {
    setGenerandoReporte(true);
    try {
      const facturas = await listarFacturasReporte(token, filtros);
      const blob = await blobReporteFacturas({
        facturas,
        totales,
        empresa: empresa.nombre,
        filtros: [debounced && `Búsqueda: ${debounced}`, estado && `Estado: ${etiquetaEstado(estado)}`].filter(Boolean).join(" · ") || "Todas las facturas",
      });
      if (reporteUrl) URL.revokeObjectURL(reporteUrl);
      setReporteUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo generar el reporte");
    } finally {
      setGenerandoReporte(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Facturación</h1>
          <p className="text-sm text-muted-foreground">Borradores, envío al SRI, PDF RIDE y estadísticas.</p>
        </div>
        {pestana === "facturas" && (
          <div className="flex gap-2">
            <Button variant="outline" disabled={generandoReporte} onClick={() => void abrirReporte()}>
              <FileText className="mr-2 h-4 w-4" /> {generandoReporte ? "Generando..." : "Reporte PDF"}
            </Button>
            <Button onClick={() => { setEdicion(null); setDrawer(true); }}><Plus className="h-4 w-4 mr-2" /> Nueva factura</Button>
          </div>
        )}
      </div>

      <div className="flex gap-1 rounded-lg border p-1 w-fit">
        <button type="button" className={`rounded-md px-3 py-1.5 text-sm ${pestana === "facturas" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => setPestana("facturas")}>
          <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4" /> Facturas</span>
        </button>
        <button type="button" className={`rounded-md px-3 py-1.5 text-sm ${pestana === "estadisticas" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => setPestana("estadisticas")}>
          <span className="inline-flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Estadísticas</span>
        </button>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {exito && <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary whitespace-pre-wrap">{exito}</div>}

      {pestana === "estadisticas" ? (
        <FacturacionEstadisticas token={token} />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Buscar número, cliente o cédula/RUC" className="pl-10" />
            </div>
            <select className="flex h-10 rounded-md border px-3 text-sm bg-background sm:w-52" value={estado} onChange={(e) => { setEstado(e.target.value as "" | EstadoFactura); setPage(0); }}>
              <option value="">Todos</option>
              <option value="BORRADOR">Borrador</option>
              <option value="PENDIENTE_AUTORIZACION">Pendiente</option>
              <option value="AUTORIZADA">Autorizada</option>
              <option value="RECHAZADA">Rechazada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
          <MuiDataTable
            rows={rows}
            columns={columns}
            loading={cargando}
            page={page}
            pageSize={pageSize}
            rowCount={total}
            paginationMode="server"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            storageKey="mecanicos.facturas.columnas"
            showToolbar
            footerTotalFields={["subtotal", "iva15", "iva5", "iva0", "total"]}
            footerTotalLabel="Total general"
            footerTotalValues={{
              subtotal: totales.subtotal,
              iva15: totales.iva15,
              iva5: totales.iva5,
              iva0: totales.iva0,
              total: totales.total,
            }}
          />
        </>
      )}

      <FacturaFormDrawer
        abierto={drawer}
        cargando={guardando}
        factura={edicion}
        clientes={clientes}
        productos={productos}
        servicios={servicios}
        formasPago={formas}
        bodegas={bodegas}
        existencias={existencias}
        onCargarExistencias={cargarExistencias}
        onClose={() => { setDrawer(false); setEdicion(null); }}
        onSubmit={guardar}
      />
      <FacturaDetalleDialog factura={detalle} onClose={() => setDetalle(null)} />
      {reporteUrl && (
        <Portal>
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setReporteUrl(null)} />
            <div className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-card shadow-elegant">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <h2 className="text-lg font-semibold">Reporte de facturas</h2>
                <div className="flex gap-2">
                  <Button onClick={() => {
                    const a = document.createElement("a");
                    a.href = reporteUrl;
                    a.download = "reporte-facturas.pdf";
                    a.click();
                  }}>Descargar PDF</Button>
                  <Button variant="outline" onClick={() => setReporteUrl(null)}>Cerrar</Button>
                </div>
              </div>
              <iframe title="Reporte de facturas" src={reporteUrl} className="h-full w-full bg-white" />
            </div>
          </div>
        </Portal>
      )}
      <ConfirmDialog
        open={Boolean(eliminar)}
        title="Eliminar factura"
        description={eliminar ? `¿Eliminar ${eliminar.numero}? Se restará el secuencial si es la última.` : ""}
        onClose={() => setEliminar(null)}
        onConfirm={async () => {
          if (!eliminar) return;
          try {
            await eliminarFactura(token, eliminar.id);
            setEliminar(null);
            await cargar();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
            setEliminar(null);
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(cancelar)}
        title="Cancelar factura"
        description={cancelar ? `¿Dar por cancelada la factura ${cancelar.numero}?` : ""}
        confirmText="Cancelar factura"
        onClose={() => setCancelar(null)}
        onConfirm={async () => {
          if (!cancelar) return;
          try {
            await cancelarFactura(token, cancelar.id);
            setCancelar(null);
            setExito("Factura cancelada");
            await cargar();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo cancelar");
            setCancelar(null);
          }
        }}
      />
    </div>
  );
}
