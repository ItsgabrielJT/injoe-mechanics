"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { ClipboardList, Eye, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { crearCliente, listarClientes } from "@/modules/clientes/infrastructure/clientes-api";
import type { Cliente } from "@/modules/clientes/domain/entities";
import { crearDesdeOrden, listarFormasPago } from "@/modules/facturacion/infrastructure/facturacion-api";
import type { FormaPago, TipoReceptor } from "@/modules/facturacion/domain/entities";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";
import type { Bodega, CategoriaProducto, Producto } from "@/modules/inventario/domain/entities";
import { listarBodegas, listarCategorias, listarProductos } from "@/modules/inventario/infrastructure/inventario-api";
import type { Proveedor } from "@/modules/proveedores/domain/entities";
import { listarProveedores } from "@/modules/proveedores/infrastructure/proveedores-api";
import type { Servicio } from "@/modules/servicios/domain/entities";
import { listarServicios } from "@/modules/servicios/infrastructure/servicios-api";
import { formatoMoneda, type EstadoOrden, type OrdenInput, type OrdenTrabajo, type Tecnico } from "@/modules/ordenes-trabajo/domain/entities";
import { cerrarOrden, eliminarOrden, guardarOrden, listarOrdenes, listarTecnicos, obtenerOrden } from "@/modules/ordenes-trabajo/infrastructure/ordenes-api";
import { OrdenTrabajoFormDrawer } from "@/modules/ordenes-trabajo/presentation/forms/orden-trabajo-form-drawer";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { MuiDataTable } from "@/shared/components/MuiDataTable";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ApiError } from "@/shared/infrastructure/http/http-error";

function fechaCorta(valor?: string | null): string {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    dateStyle: "short",
    timeStyle: "short",
  }).format(fecha);
}

export function OrdenesTrabajoPage() {
  const { sesion, puntoActivo } = useSesionContext();
  const token = sesion?.accessToken ?? "";
  const [rows, setRows] = useState<OrdenTrabajo[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [estado, setEstado] = useState<"all" | EstadoOrden>("all");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [edicion, setEdicion] = useState<OrdenTrabajo | null>(null);
  const [detalle, setDetalle] = useState<OrdenTrabajo | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminar, setEliminar] = useState<OrdenTrabajo | null>(null);
  const [cerrar, setCerrar] = useState<OrdenTrabajo | null>(null);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [facturar, setFacturar] = useState<OrdenTrabajo | null>(null);
  const [receptor, setReceptor] = useState<"cf" | "ot" | "otro">("ot");
  const [otroClienteId, setOtroClienteId] = useState<number | null>(null);
  const [nuevoCliente, setNuevoCliente] = useState({ identificacion: "", nombres: "", correo: "" });
  const [clientesFactura, setClientesFactura] = useState<Cliente[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const filtros = { search: debounced || undefined, estado: estado === "all" ? undefined : estado };
      const primera = await listarOrdenes(token, { page: 1, size: 100, ...filtros });
      const ordenes = [...primera.data];
      for (let pagina = 2; pagina <= primera.pages; pagina += 1) {
        const siguiente = await listarOrdenes(token, { page: pagina, size: 100, ...filtros });
        ordenes.push(...siguiente.data);
      }
      setRows(ordenes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar las órdenes");
    } finally {
      setCargando(false);
    }
  }, [debounced, estado, token]);

  const cargarCatalogos = useCallback(async () => {
    if (!token) return;
    try {
      const [tec, prods, servs, provs, bods, cats] = await Promise.all([
        listarTecnicos(token),
        listarProductos(token, { page: 1, size: 100, activo: true }),
        listarServicios(token, { page: 1, size: 100, activo: true }),
        listarProveedores(token, { page: 1, size: 100, activo: true }),
        listarBodegas(token, { page: 1, size: 100, activo: true }),
        listarCategorias(token, { page: 1, size: 100, activo: true }),
      ]);
      setTecnicos(tec);
      setProductos(prods.data);
      setServicios(servs.data);
      setProveedores(provs.data);
      setBodegas(bods.data);
      setCategorias(cats.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar los catálogos");
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar, puntoActivo?.id]);

  useEffect(() => {
    void cargarCatalogos();
  }, [cargarCatalogos, puntoActivo?.id]);

  useEffect(() => {
    setPage(0);
  }, [debounced, estado]);

  async function abrirFacturar(row: OrdenTrabajo) {
    try {
      const completa = await obtenerOrden(token, row.id);
      const [cli, fps] = await Promise.all([
        listarClientes(token, { page: 1, size: 100 }),
        listarFormasPago(token),
      ]);
      setClientesFactura(cli.data);
      setFormasPago(fps);
      setReceptor("ot");
      setOtroClienteId(null);
      setNuevoCliente({ identificacion: "", nombres: "", correo: "" });
      setFacturar(completa);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo preparar la factura");
    }
  }

  async function confirmarFactura() {
    if (!facturar) return;
    try {
      let tipo: TipoReceptor = "consumidor_final";
      let clienteId: number | null = null;
      if (receptor === "ot") {
        tipo = "cliente";
        clienteId = facturar.clienteId;
      } else if (receptor === "otro") {
        tipo = "cliente";
        if (otroClienteId) {
          clienteId = otroClienteId;
        } else {
          const creado = await crearCliente(token, {
            identificacion: nuevoCliente.identificacion,
            nombres: nuevoCliente.nombres,
            correos: [nuevoCliente.correo],
            tipo_cliente: nuevoCliente.identificacion.length === 13 ? "PERSONA_JURIDICA" : "PERSONA_NATURAL",
            direcciones: [],
            telefonos: [],
            activo: true,
          });
          clienteId = creado.id;
        }
      }
      await crearDesdeOrden(token, facturar.id, {
        tipo_receptor: tipo,
        cliente_id: clienteId,
        forma_pago_id: formasPago[0]?.id ?? null,
      });
      setFacturar(null);
      setExito("Factura creada en borrador");
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la factura");
    }
  }

  async function abrirDetalle(row: OrdenTrabajo) {
    try {
      setDetalle(await obtenerOrden(token, row.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo abrir el detalle");
    }
  }

  async function abrirEdicion(row: OrdenTrabajo) {
    try {
      setEdicion(await obtenerOrden(token, row.id));
      setDrawer(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo abrir la orden");
    }
  }

  const totalesDetalle = useMemo(() => {
    if (!detalle) return { venta: 0, costo: 0, utilidad: 0 };
    return detalle.items.reduce(
      (acc, item) => ({
        venta: acc.venta + item.total,
        costo: acc.costo + item.precioCompra * item.cantidad,
        utilidad: acc.utilidad + item.utilidad,
      }),
      { venta: 0, costo: 0, utilidad: 0 },
    );
  }, [detalle]);

  const columns = useMemo<GridColDef[]>(() => [
    { field: "numero", headerName: "Número", minWidth: 120, flex: 0.6 },
    { field: "clienteNombres", headerName: "Cliente", minWidth: 160, flex: 1 },
    {
      field: "vehiculo",
      headerName: "Vehículo",
      minWidth: 160,
      flex: 1,
      valueGetter: (_v, row) => [row.vehiculoPlaca, row.vehiculoMarca, row.vehiculoModelo].filter(Boolean).join(" · "),
    },
    { field: "tecnicoNombre", headerName: "Técnico", minWidth: 140, flex: 0.8 },
    {
      field: "estado",
      headerName: "Estado",
      minWidth: 160,
      renderCell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span>{row.estado === "CERRADA" ? "Cerrada" : "En proceso"}</span>
          {row.facturada && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">Facturada {row.facturaNumero}</span>}
        </div>
      ),
    },
    { field: "fechaInicio", headerName: "Inicio", minWidth: 150, valueGetter: (_v, row) => fechaCorta(row.fechaInicio) },
    { field: "fechaEntrega", headerName: "Entrega", minWidth: 150, valueGetter: (_v, row) => fechaCorta(row.fechaEntrega) },
    { field: "totalCosto", headerName: "Costo", minWidth: 110, type: "number", valueFormatter: (value) => formatoMoneda(Number(value ?? 0)) },
    { field: "totalUtilidad", headerName: "Utilidad", minWidth: 110, type: "number", valueFormatter: (value) => formatoMoneda(Number(value ?? 0)) },
    { field: "total", headerName: "Total", minWidth: 110, type: "number", valueFormatter: (value) => formatoMoneda(Number(value ?? 0)) },
    {
      field: "acciones",
      headerName: "Acciones",
      width: 210,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => void abrirDetalle(row)}><Eye className="h-4 w-4" /></Button>
          {row.estado === "EN_PROCESO" && (
            <Button size="icon" variant="ghost" onClick={() => void abrirEdicion(row)}><Pencil className="h-4 w-4" /></Button>
          )}
          {row.estado === "EN_PROCESO" && (
            <Button size="icon" variant="ghost" onClick={() => setEliminar(row)}><Trash2 className="h-4 w-4" /></Button>
          )}
          {row.estado === "CERRADA" && !row.facturada && (
            <Button size="icon" variant="ghost" title="Facturar" aria-label="Facturar" onClick={() => void abrirFacturar(row)}><FileText className="h-4 w-4" /></Button>
          )}
        </div>
      ),
    },
  ], []);

  async function guardar(body: OrdenInput) {
    setGuardando(true);
    setError(null);
    try {
      await guardarOrden(token, body, edicion?.id);
      setExito(edicion ? "Orden actualizada" : "Orden creada");
      setDrawer(false);
      setEdicion(null);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la orden");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><ClipboardList className="h-6 w-6 text-primary" /> Órdenes de trabajo</h1>
          <p className="text-sm text-muted-foreground">Lanza la OT con nombre y placa; completa la ficha después en Clientes.</p>
        </div>
        <Button onClick={() => { setEdicion(null); setDrawer(true); }}><Plus className="h-4 w-4 mr-2" /> Nueva orden</Button>
      </div>
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {exito && <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">{exito}</div>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar número, cliente, placa o cédula" className="pl-10" />
        </div>
        <select className="flex h-10 rounded-md border border-input px-3 text-sm bg-background sm:w-44" value={estado} onChange={(event) => setEstado(event.target.value as "all" | EstadoOrden)}>
          <option value="all">Todos</option>
          <option value="EN_PROCESO">En proceso</option>
          <option value="CERRADA">Cerrada</option>
        </select>
      </div>
      <MuiDataTable
        rows={rows}
        columns={columns}
        loading={cargando}
        page={page}
        pageSize={pageSize}
        rowCount={rows.length}
        paginationMode="client"
        filterMode="client"
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        storageKey="mecanicos.ordenes.columnas.v2"
        showToolbar
        footerTotalFields={["totalCosto", "totalUtilidad", "total"]}
      />
      <OrdenTrabajoFormDrawer
        abierto={drawer}
        cargando={guardando}
        token={token}
        orden={edicion}
        tecnicos={tecnicos}
        productos={productos}
        servicios={servicios}
        proveedores={proveedores}
        bodegas={bodegas}
        categorias={categorias}
        onCatalogoChange={cargarCatalogos}
        onClose={() => { setDrawer(false); setEdicion(null); }}
        onSubmit={guardar}
      />
      {detalle && (
        <Portal>
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDetalle(null)} />
            <div className="relative w-full max-w-3xl rounded-t-2xl sm:rounded-2xl bg-card shadow-elegant max-h-[92dvh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3 border-b px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">{detalle.numero}</h2>
                  <p className="text-sm text-muted-foreground">{detalle.estado === "CERRADA" ? "Cerrada" : "En proceso"}</p>
                </div>
                <Button variant="ghost" onClick={() => setDetalle(null)}>Cerrar</Button>
              </div>
              <div className="px-6 py-4 space-y-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <p><span className="text-muted-foreground">Cliente: </span>{detalle.clienteNombres}{detalle.clienteIdentificacion ? ` · ${detalle.clienteIdentificacion}` : " · Cédula pendiente"}</p>
                  <p><span className="text-muted-foreground">Vehículo: </span>{[detalle.vehiculoPlaca, detalle.vehiculoMarca, detalle.vehiculoModelo].filter(Boolean).join(" · ")}</p>
                  <p><span className="text-muted-foreground">Técnico: </span>{detalle.tecnicoNombre ?? "—"}</p>
                  <p><span className="text-muted-foreground">Kilometraje: </span>{detalle.kilometraje ?? "—"}</p>
                  <p><span className="text-muted-foreground">Inicio: </span>{fechaCorta(detalle.fechaInicio)}</p>
                  <p><span className="text-muted-foreground">Entrega: </span>{fechaCorta(detalle.fechaEntrega)}</p>
                </div>
                {detalle.notasGenerales && <p><span className="text-muted-foreground">Notas: </span>{detalle.notasGenerales}</p>}
                {detalle.notasTecnicas && <p><span className="text-muted-foreground">Notas técnicas: </span>{detalle.notasTecnicas}</p>}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2 pr-3">Ítem</th>
                        <th className="py-2 pr-3">Cant.</th>
                        <th className="py-2 pr-3">Venta</th>
                        <th className="py-2 pr-3">Costo</th>
                        <th className="py-2">Utilidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.items.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-2 pr-3">{item.descripcion}<div className="text-xs text-muted-foreground">{item.proveedorNombres}{item.bodegaNombre ? ` · ${item.bodegaNombre}` : ""}</div></td>
                          <td className="py-2 pr-3">{item.cantidad}</td>
                          <td className="py-2 pr-3">{formatoMoneda(item.total)}</td>
                          <td className="py-2 pr-3">{formatoMoneda(item.precioCompra * item.cantidad)}</td>
                          <td className="py-2">{formatoMoneda(item.utilidad)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold border-t">
                        <td className="py-2 pr-3" colSpan={2}>Totales</td>
                        <td className="py-2 pr-3">{formatoMoneda(totalesDetalle.venta)}</td>
                        <td className="py-2 pr-3">{formatoMoneda(totalesDetalle.costo)}</td>
                        <td className="py-2">{formatoMoneda(totalesDetalle.utilidad)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              {detalle.estado === "CERRADA" && !detalle.facturada && (
                <div className="flex justify-end gap-2 border-t px-6 py-4">
                  <Button onClick={() => { void abrirFacturar(detalle); setDetalle(null); }}>Facturar</Button>
                </div>
              )}
              {detalle.estado === "EN_PROCESO" && (
                <div className="flex justify-end gap-2 border-t px-6 py-4">
                  <Button variant="outline" onClick={() => { void abrirEdicion(detalle); setDetalle(null); }}>Editar</Button>
                  <Button onClick={() => { setCerrar(detalle); }}>Cerrar orden</Button>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
      <ConfirmDialog
        open={Boolean(eliminar)}
        title="Eliminar orden"
        description={eliminar ? `¿Eliminar ${eliminar.numero}? Solo se puede si está en proceso.` : ""}
        onClose={() => setEliminar(null)}
        onConfirm={async () => {
          if (!eliminar) return;
          try {
            await eliminarOrden(token, eliminar.id);
            setEliminar(null);
            await cargar();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
            setEliminar(null);
          }
        }}
      />
      {facturar && (
        <Portal>
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setFacturar(null)} />
            <div className="relative w-full max-w-lg rounded-2xl bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">¿A nombre de quién desea facturar?</h2>
              <label className="flex items-center gap-2 text-sm"><input type="radio" checked={receptor === "cf"} onChange={() => setReceptor("cf")} /> Consumidor Final</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" checked={receptor === "ot"} onChange={() => setReceptor("ot")} /> {facturar.clienteNombres}{facturar.clienteIdentificacion ? ` - CI ${facturar.clienteIdentificacion}` : ""}</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" checked={receptor === "otro"} onChange={() => setReceptor("otro")} /> Otro cliente / empresa</label>
              {receptor === "otro" && (
                <div className="space-y-2">
                  <select className="flex h-10 w-full rounded-md border px-3 text-sm bg-background" value={otroClienteId ?? ""} onChange={(e) => setOtroClienteId(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Seleccionar existente</option>
                    {clientesFactura.map((c) => <option key={c.id} value={c.id}>{c.nombres} {c.identificacion ?? ""}</option>)}
                  </select>
                  {!otroClienteId && (
                    <div className="grid gap-2">
                      <Input placeholder="Cédula / RUC" value={nuevoCliente.identificacion} onChange={(e) => setNuevoCliente({ ...nuevoCliente, identificacion: e.target.value })} />
                      <Input placeholder="Nombre" value={nuevoCliente.nombres} onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombres: e.target.value })} />
                      <Input placeholder="Correo" value={nuevoCliente.correo} onChange={(e) => setNuevoCliente({ ...nuevoCliente, correo: e.target.value })} />
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setFacturar(null)}>Cancelar</Button>
                <Button onClick={() => void confirmarFactura()}>Crear borrador</Button>
              </div>
            </div>
          </div>
        </Portal>
      )}
      <ConfirmDialog
        open={Boolean(cerrar)}
        title="Cerrar orden"
        description={cerrar ? `Al cerrar ${cerrar.numero} se descuenta el stock de los productos con inventario.` : ""}
        confirmText="Cerrar"
        variant="default"
        onClose={() => setCerrar(null)}
        onConfirm={async () => {
          if (!cerrar) return;
          try {
            const actualizada = await cerrarOrden(token, cerrar.id);
            setCerrar(null);
            setDetalle(actualizada);
            setExito("Orden cerrada");
            await cargar();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo cerrar la orden");
            setCerrar(null);
          }
        }}
      />
    </div>
  );
}
