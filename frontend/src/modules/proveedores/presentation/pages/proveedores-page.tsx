"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { Pencil, Plus, Search, Trash2, Truck } from "lucide-react";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";
import type { Proveedor, ProveedorInput } from "@/modules/proveedores/domain/entities";
import {
  actualizarProveedor,
  crearProveedor,
  eliminarProveedor,
  listarProveedores,
} from "@/modules/proveedores/infrastructure/proveedores-api";
import { ProveedorFormDrawer, type ProveedorFormValues } from "@/modules/proveedores/presentation/forms/proveedor-form-drawer";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { MuiDataTable } from "@/shared/components/MuiDataTable";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ApiError } from "@/shared/infrastructure/http/http-error";

export function ProveedoresPage() {
  const { sesion, puntoActivo } = useSesionContext();
  const token = sesion?.accessToken ?? "";
  const [rows, setRows] = useState<Proveedor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [estado, setEstado] = useState("all");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [edicion, setEdicion] = useState<Proveedor | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminar, setEliminar] = useState<Proveedor | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const respuesta = await listarProveedores(token, {
        page: page + 1,
        size: pageSize,
        search: debounced || undefined,
        activo: estado === "all" ? undefined : estado === "active",
      });
      setRows(respuesta.data);
      setTotal(respuesta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar los proveedores");
    } finally {
      setCargando(false);
    }
  }, [debounced, estado, page, pageSize, token]);

  useEffect(() => {
    void cargar();
  }, [cargar, puntoActivo?.id]);

  useEffect(() => {
    setPage(0);
  }, [debounced, estado]);

  const columns = useMemo<GridColDef[]>(() => [
    { field: "identificacion", headerName: "RUC / Cédula", flex: 0.8, minWidth: 130 },
    { field: "nombres", headerName: "Nombre", flex: 1.2, minWidth: 180 },
    { field: "telefono", headerName: "Teléfono", flex: 0.7, minWidth: 120 },
    { field: "correo", headerName: "Correo", flex: 1, minWidth: 160 },
    {
      field: "activo",
      headerName: "Estado",
      width: 110,
      valueGetter: (_v, row) => (row.activo ? "Activo" : "Inactivo"),
    },
    {
      field: "acciones",
      headerName: "",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => { setEdicion(row); setDrawer(true); }}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => setEliminar(row)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ], []);

  async function guardar(values: ProveedorFormValues) {
    setGuardando(true);
    setError(null);
    try {
      const body: ProveedorInput = {
        identificacion: values.identificacion,
        nombres: values.nombres,
        tipo_persona: values.tipo_persona,
        razon_social: values.razon_social || null,
        direccion: values.direccion || null,
        telefono: values.telefono || null,
        correo: values.correo || null,
        direccion_fiscal: values.direccion_fiscal || null,
        telefono_fiscal: values.telefono_fiscal || null,
        correo_fiscal: values.correo_fiscal || null,
        notas: values.notas || null,
        activo: values.activo,
      };
      if (edicion) {
        await actualizarProveedor(token, edicion.id, body);
        setExito("Proveedor actualizado");
      } else {
        await crearProveedor(token, body);
        setExito("Proveedor creado");
      }
      setDrawer(false);
      setEdicion(null);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el proveedor");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Truck className="h-6 w-6 text-primary" /> Proveedores</h1>
          <p className="text-sm text-muted-foreground">Maestro de compras. El RUC y el nombre bastan para registrar.</p>
        </div>
        <Button onClick={() => { setEdicion(null); setDrawer(true); }}><Plus className="h-4 w-4 mr-2" /> Nuevo proveedor</Button>
      </div>
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {exito && <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">{exito}</div>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por RUC, nombre o correo" className="pl-10" />
        </div>
        <select className="flex h-10 rounded-md border border-input px-3 text-sm bg-background sm:w-44" value={estado} onChange={(event) => setEstado(event.target.value)}>
          <option value="all">Todos</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
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
        storageKey="mecanicos.proveedores.columnas"
        showToolbar
      />
      <ProveedorFormDrawer
        abierto={drawer}
        proveedor={edicion}
        cargando={guardando}
        onClose={() => setDrawer(false)}
        onSubmit={guardar}
      />
      <ConfirmDialog
        open={Boolean(eliminar)}
        title="Eliminar proveedor"
        description={eliminar ? `¿Eliminar a ${eliminar.nombres}?` : ""}
        onClose={() => setEliminar(null)}
        onConfirm={async () => {
          if (!eliminar) return;
          try {
            await eliminarProveedor(token, eliminar.id);
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
