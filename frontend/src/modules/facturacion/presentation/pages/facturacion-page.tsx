"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { FileText, Plus, Search, Send, Trash2 } from "lucide-react";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";
import { listarClientes } from "@/modules/clientes/infrastructure/clientes-api";
import type { Cliente } from "@/modules/clientes/domain/entities";
import { listarBodegas, listarExistencias, listarProductos } from "@/modules/inventario/infrastructure/inventario-api";
import type { Bodega, Existencia, Producto } from "@/modules/inventario/domain/entities";
import { listarServicios } from "@/modules/servicios/infrastructure/servicios-api";
import type { Servicio } from "@/modules/servicios/domain/entities";
import { obtenerEmpresa } from "@/modules/configuracion/infrastructure/configuracion-api";
import type { EstadoFactura, Factura, FacturaInput, FormaPago } from "@/modules/facturacion/domain/entities";
import {
  eliminarFactura,
  enviarSri,
  guardarFactura,
  listarFacturas,
  listarFormasPago,
} from "@/modules/facturacion/infrastructure/facturacion-api";
import { FacturaFormDrawer } from "@/modules/facturacion/presentation/forms/factura-form-drawer";
import { descargarPdfFactura } from "@/modules/facturacion/presentation/pdf/invoice-pdf";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { MuiDataTable } from "@/shared/components/MuiDataTable";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ApiError } from "@/shared/infrastructure/http/http-error";

function etiquetaEstado(estado: EstadoFactura): string {
  return {
    BORRADOR: "Borrador",
    ENVIADA: "Enviada",
    PENDIENTE_AUTORIZACION: "Pendiente SRI",
    AUTORIZADA: "Autorizada",
    RECHAZADA: "Rechazada",
    CANCELADA: "Cancelada",
  }[estado];
}

export function FacturacionPage() {
  const { sesion, puntoActivo } = useSesionContext();
  const token = sesion?.accessToken ?? "";
  const [rows, setRows] = useState<Factura[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [estado, setEstado] = useState<"" | EstadoFactura>("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [edicion, setEdicion] = useState<Factura | null>(null);
  const [eliminar, setEliminar] = useState<Factura | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [formas, setFormas] = useState<FormaPago[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [existencias, setExistencias] = useState<Record<number, Existencia[]>>({});
  const existenciasRef = useRef<Record<number, Existencia[]>>({});
  existenciasRef.current = existencias;
  const [empresa, setEmpresa] = useState({ nombre: "INJOE", ruc: "", direccion: "" });

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    try {
      const lista = await listarFacturas(token, { page: page + 1, size: pageSize, search: debounced || undefined, estado: estado || undefined });
      setRows(lista.data);
      setTotal(lista.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar las facturas");
    } finally {
      setCargando(false);
    }
  }, [token, page, pageSize, debounced, estado]);

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
    setEmpresa({ nombre: emp.nombre, ruc: emp.ruc, direccion: emp.direccion });
  }, [token]);

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

  const columns = useMemo<GridColDef[]>(() => [
    { field: "numero", headerName: "Número", minWidth: 160, flex: 0.8 },
    { field: "clienteNombres", headerName: "Cliente", minWidth: 180, flex: 1, valueGetter: (_v, row) => row.tipoReceptor === "consumidor_final" ? "Consumidor final" : row.clienteNombres },
    { field: "estado", headerName: "Estado", minWidth: 150, valueGetter: (_v, row) => etiquetaEstado(row.estado) },
    { field: "fechaEmision", headerName: "Emisión", minWidth: 120 },
    { field: "total", headerName: "Total", minWidth: 110, type: "number", valueFormatter: (value) => Number(value ?? 0).toFixed(2) },
    {
      field: "acciones",
      headerName: "",
      width: 220,
      sortable: false,
      renderCell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" title="PDF" onClick={() => void descargarPdfFactura(row, empresa.nombre, empresa.ruc, empresa.direccion)}><FileText className="h-4 w-4" /></Button>
          {row.estado === "BORRADOR" && (
            <>
              <Button size="sm" variant="outline" onClick={() => { setEdicion(row); setDrawer(true); }}>Editar</Button>
              <Button size="icon" variant="ghost" onClick={() => void enviar(row)}><Send className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setEliminar(row)}><Trash2 className="h-4 w-4" /></Button>
            </>
          )}
          {["RECHAZADA", "PENDIENTE_AUTORIZACION"].includes(row.estado) && (
            <Button size="sm" variant="outline" onClick={() => void enviar(row)}>Reenviar</Button>
          )}
        </div>
      ),
    },
  ], [empresa]);

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
    try {
      const actualizada = await enviarSri(token, row.id);
      setExito(actualizada.estado === "AUTORIZADA" ? "Factura autorizada" : actualizada.reasonError || etiquetaEstado(actualizada.estado));
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar al SRI");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Facturación</h1>
          <p className="text-sm text-muted-foreground">Borradores, envío al SRI y PDF RIDE.</p>
        </div>
        <Button onClick={() => { setEdicion(null); setDrawer(true); }}><Plus className="h-4 w-4 mr-2" /> Nueva factura</Button>
      </div>
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {exito && <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary whitespace-pre-wrap">{exito}</div>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar número o clave" className="pl-10" />
        </div>
        <select className="flex h-10 rounded-md border px-3 text-sm bg-background sm:w-52" value={estado} onChange={(e) => setEstado(e.target.value as "" | EstadoFactura)}>
          <option value="">Todos</option>
          <option value="BORRADOR">Borrador</option>
          <option value="PENDIENTE_AUTORIZACION">Pendiente</option>
          <option value="AUTORIZADA">Autorizada</option>
          <option value="RECHAZADA">Rechazada</option>
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
      />
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
    </div>
  );
}
