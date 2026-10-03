"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { Briefcase, Pencil, Plus, Search, Trash2, Truck } from "lucide-react";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";
import {
  CATEGORIAS_SERVICIO,
  etiquetaCategoria,
  etiquetaImpuesto,
  type CategoriaServicio,
  type Servicio,
  type ServicioInput,
} from "@/modules/servicios/domain/entities";
import {
  actualizarServicio,
  crearServicio,
  eliminarServicio,
  listarServicios,
} from "@/modules/servicios/infrastructure/servicios-api";
import {
  ServicioFormDrawer,
  aCategoria,
  type ServicioFormValues,
} from "@/modules/servicios/presentation/forms/servicio-form-drawer";
import { PreciosProveedorPanel } from "@/modules/proveedores";
import { BuscadorMultiple } from "@/modules/inventario/presentation/components/buscador-select";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { MuiDataTable } from "@/shared/components/MuiDataTable";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ApiError } from "@/shared/infrastructure/http/http-error";

function aInput(values: ServicioFormValues): ServicioInput {
  return {
    nombre: values.nombre,
    precio_venta: Number(values.precio_venta),
    tipo_impuesto: values.tipo_impuesto,
    codigo: values.codigo.trim() || null,
    descripcion: values.descripcion.trim() || null,
    categoria: aCategoria(values.categoria),
    aplica_iva: values.aplica_iva,
    peso: values.peso ?? null,
    activo: values.activo,
  };
}

function formatoPrecio(valor: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(valor);
}

export function ServiciosPage() {
  const { sesion, puntoActivo } = useSesionContext();
  const token = sesion?.accessToken ?? "";
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [categoria, setCategoria] = useState<string>("all");
  const [estado, setEstado] = useState<string>("all");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [servicioEdicion, setServicioEdicion] = useState<Servicio | null>(null);
  const [servicioAEliminar, setServicioAEliminar] = useState<Servicio | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [tab, setTab] = useState<"servicios" | "proveedores">("servicios");
  const [catalogoCostos, setCatalogoCostos] = useState<Servicio[]>([]);
  const [idsCostos, setIdsCostos] = useState<number[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const cargar = useCallback(async () => {
    if (!token) {
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const respuesta = await listarServicios(token, {
        page: page + 1,
        size: pageSize,
        search: debounced || undefined,
        categoria: categoria === "all" ? undefined : (categoria as CategoriaServicio),
        activo: estado === "all" ? undefined : estado === "active",
      });
      setServicios(respuesta.data);
      setTotal(respuesta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar los servicios");
    } finally {
      setCargando(false);
    }
  }, [categoria, debounced, estado, page, pageSize, token]);

  useEffect(() => {
    void cargar();
  }, [cargar, puntoActivo?.id]);

  useEffect(() => {
    setPage(0);
  }, [debounced, categoria, estado]);

  useEffect(() => {
    if (tab !== "proveedores" || !token) return;
    void listarServicios(token, { page: 1, size: 100, activo: true })
      .then((respuesta) => setCatalogoCostos(respuesta.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar los servicios"));
  }, [tab, token, puntoActivo?.id]);

  async function guardarServicio(values: ServicioFormValues) {
    setGuardando(true);
    setError(null);
    try {
      const body = aInput(values);
      if (servicioEdicion) {
        await actualizarServicio(token, servicioEdicion.id, body);
        setExito("Servicio actualizado");
      } else {
        await crearServicio(token, body);
        setExito("Servicio registrado");
      }
      setDrawerAbierto(false);
      setServicioEdicion(null);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el servicio");
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    if (!servicioAEliminar) {
      return;
    }
    setEliminando(true);
    setError(null);
    try {
      await eliminarServicio(token, servicioAEliminar.id);
      setExito("Servicio eliminado");
      setServicioAEliminar(null);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar el servicio");
    } finally {
      setEliminando(false);
    }
  }

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: "codigo", headerName: "Código", flex: 0.8, minWidth: 120 },
      { field: "nombre", headerName: "Nombre", flex: 1.4, minWidth: 160 },
      {
        field: "descripcion",
        headerName: "Descripción",
        flex: 1.4,
        minWidth: 160,
        valueGetter: (value) => value || "—",
      },
      {
        field: "categoria",
        headerName: "Categoría",
        minWidth: 140,
        valueGetter: (value) => etiquetaCategoria(value),
      },
      {
        field: "precioVenta",
        headerName: "Precio",
        minWidth: 120,
        valueGetter: (value) => formatoPrecio(Number(value) || 0),
      },
      {
        field: "tipoImpuesto",
        headerName: "Impuesto",
        minWidth: 120,
        valueGetter: (value) => etiquetaImpuesto(value),
      },
      {
        field: "activo",
        headerName: "Estado",
        minWidth: 110,
        valueGetter: (value) => (value ? "Activo" : "Inactivo"),
      },
      {
        field: "acciones",
        headerName: "Acciones",
        minWidth: 110,
        filterable: false,
        sortable: false,
        renderCell: (params) => {
          const servicio = params.row as Servicio;
          return (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setServicioEdicion(servicio);
                  setDrawerAbierto(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setServicioAEliminar(servicio)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
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
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Briefcase className="h-7 w-7 sm:h-8 sm:w-8 text-primary shrink-0" />
            Servicios
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Catálogo de servicios del punto activo. El precio se registra en USD.
          </p>
        </div>
        <Button
          className="w-full sm:w-auto shrink-0"
          onClick={() => {
            setServicioEdicion(null);
            setDrawerAbierto(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo servicio
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg border p-1 bg-muted/30">
        <button className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${tab === "servicios" ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"}`} onClick={() => setTab("servicios")}>
          <Briefcase className="h-4 w-4" /> Servicios
        </button>
        <button className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${tab === "proveedores" ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"}`} onClick={() => setTab("proveedores")}>
          <Truck className="h-4 w-4" /> Proveedores
        </button>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {exito && <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">{exito}</div>}

      {tab === "servicios" && (
        <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por código, nombre o descripción"
            className="pl-10 w-full"
          />
        </div>
        <select
          className="flex h-10 rounded-md border border-input px-3 text-sm bg-background sm:w-44"
          value={estado}
          onChange={(event) => setEstado(event.target.value)}
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
        <select
          className="flex h-10 rounded-md border border-input px-3 text-sm bg-background sm:w-48"
          value={categoria}
          onChange={(event) => setCategoria(event.target.value)}
        >
          <option value="all">Todas las categorías</option>
          {CATEGORIAS_SERVICIO.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <MuiDataTable
        rows={servicios}
        columns={columns}
        loading={cargando}
        page={page}
        pageSize={pageSize}
        rowCount={total}
        paginationMode="server"
        filterMode="client"
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        storageKey="mecanicos.servicios.columnas"
        showToolbar
        mobileHiddenFields={["descripcion", "categoria", "activo"]}
      />
        </>
      )}

      {tab === "proveedores" && (
        <div className="space-y-4">
          <div className="max-w-xl">
            <p className="mb-1 text-sm font-medium">Servicios</p>
            <BuscadorMultiple
              opciones={catalogoCostos.map((item) => ({ id: item.id, label: `${item.codigo} · ${item.nombre}`, extra: formatoPrecio(item.precioVenta) }))}
              valores={idsCostos}
              onChange={setIdsCostos}
              placeholder="Buscar y agregar servicios para ver sus costos"
            />
          </div>
          <PreciosProveedorPanel
            token={token}
            tipo="servicio"
            items={idsCostos
              .map((id) => catalogoCostos.find((item) => item.id === id))
              .filter((item): item is Servicio => Boolean(item))
              .map((item) => ({ id: item.id, label: `${item.codigo} · ${item.nombre}` }))}
          />
        </div>
      )}

      <ServicioFormDrawer
        abierto={drawerAbierto}
        servicio={servicioEdicion}
        cargando={guardando}
        onClose={() => setDrawerAbierto(false)}
        onSubmit={guardarServicio}
      />

      <ConfirmDialog
        open={Boolean(servicioAEliminar)}
        title="Eliminar servicio"
        description="Esta acción no se puede deshacer."
        confirmText="Eliminar servicio"
        loading={eliminando}
        details={
          servicioAEliminar
            ? [
                { label: "Código", value: servicioAEliminar.codigo },
                { label: "Nombre", value: servicioAEliminar.nombre },
                { label: "Precio", value: formatoPrecio(servicioAEliminar.precioVenta) },
                { label: "Impuesto", value: etiquetaImpuesto(servicioAEliminar.tipoImpuesto) },
                { label: "Categoría", value: etiquetaCategoria(servicioAEliminar.categoria) },
              ]
            : []
        }
        onClose={() => setServicioAEliminar(null)}
        onConfirm={confirmarEliminar}
      />
    </div>
  );
}
