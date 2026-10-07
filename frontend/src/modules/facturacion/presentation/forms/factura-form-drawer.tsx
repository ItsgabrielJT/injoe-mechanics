"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, Package, Trash2, Wrench, X } from "lucide-react";
import { listarClientes } from "@/modules/clientes/infrastructure/clientes-api";
import { listarProductos } from "@/modules/inventario/infrastructure/inventario-api";
import { BuscadorSelect, type OpcionBuscador } from "@/modules/inventario/presentation/components/buscador-select";
import type { Bodega, Existencia, Producto, TipoImpuesto } from "@/modules/inventario/domain/entities";
import type { Servicio } from "@/modules/servicios/domain/entities";
import { listarServicios } from "@/modules/servicios/infrastructure/servicios-api";
import type { Factura, FacturaInput, FormaPago, ItemFacturaInput, TipoReceptor } from "@/modules/facturacion/domain/entities";
import { numeroVacio, tasaIva, TIPOS_IMPUESTO } from "@/modules/facturacion/domain/entities";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { listarTodasLasPaginas } from "@/shared/lib/listar-todas-las-paginas";
import { cn } from "@/shared/lib/utils";

const MIN_BUSQUEDA = 3;

interface LineaForm {
  key: string;
  producto_id: number | null;
  servicio_id: number | null;
  descripcion: string;
  codigo: string;
  cantidad: string;
  precio_mostrado: string;
  incluye_iva: boolean;
  descuento_porcentaje: string;
  tipo_impuesto: TipoImpuesto;
  bodega_id: number | null;
  aplica_inventario: boolean;
}

function nuevaKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hoy(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
}

function dinero(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function cobraIva(tipo: TipoImpuesto): boolean {
  return tipo === "15" || tipo === "5";
}

/** El valor tipeado se conserva. Incluye IVA solo decide si ese valor ya trae impuesto. */
function recalc(linea: LineaForm) {
  const qty = numeroVacio(linea.cantidad);
  const tipeado = numeroVacio(linea.precio_mostrado);
  const tasa = cobraIva(linea.tipo_impuesto) ? tasaIva(linea.tipo_impuesto, true) : 0;
  const precioBase = linea.incluye_iva && tasa > 0 ? dinero(tipeado / (1 + tasa)) : dinero(tipeado);
  const bruto = qty * precioBase;
  const descuento = bruto * (numeroVacio(linea.descuento_porcentaje) / 100);
  const subtotal = dinero(bruto - descuento);
  const iva = dinero(subtotal * tasa);
  return { precioBase, subtotal, iva, descuento: dinero(descuento), total: dinero(subtotal + iva) };
}

function stockBodega(existencias: Existencia[] | undefined, bodegaId: number | null): number | null {
  if (!existencias || !bodegaId) return null;
  const fila = existencias.find((item) => item.bodegaId === bodegaId);
  return fila ? fila.cantidad : 0;
}

interface Props {
  abierto: boolean;
  token: string;
  cargando?: boolean;
  factura?: Factura | null;
  formasPago: FormaPago[];
  bodegas: Bodega[];
  existencias: Record<number, Existencia[]>;
  onCargarExistencias: (productoId: number) => Promise<Existencia[] | void>;
  onClose: () => void;
  onSubmit: (body: FacturaInput) => Promise<void>;
}

export function FacturaFormDrawer({
  abierto,
  token,
  cargando,
  factura,
  formasPago,
  bodegas,
  existencias,
  onCargarExistencias,
  onClose,
  onSubmit,
}: Props) {
  const [tipoReceptor, setTipoReceptor] = useState<TipoReceptor>("cliente");
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [formaPagoId, setFormaPagoId] = useState<number | null>(null);
  const [fecha, setFecha] = useState(hoy());
  const [fechaPago, setFechaPago] = useState("");
  const [notas, setNotas] = useState("");
  const [terminos, setTerminos] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [lineas, setLineas] = useState<LineaForm[]>([]);
  const [productosHallados, setProductosHallados] = useState<Producto[]>([]);
  const [serviciosHallados, setServiciosHallados] = useState<Servicio[]>([]);
  const [buscandoItems, setBuscandoItems] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setTipoReceptor(factura?.tipoReceptor ?? "cliente");
    setClienteId(factura?.clienteId ?? null);
    setFormaPagoId(factura?.formaPagoId ?? formasPago[0]?.id ?? null);
    setFecha(factura?.fechaEmision ?? hoy());
    setFechaPago(factura?.fechaPago ?? "");
    setNotas(factura?.notas ?? "");
    setTerminos(factura?.terminos ?? "");
    setBusqueda("");
    setProductosHallados([]);
    setServiciosHallados([]);
    setLineas((factura?.items ?? []).map((item) => {
      const aplicaInventario = item.aplicaInventario;
      return {
        key: nuevaKey(),
        producto_id: item.productoId,
        servicio_id: item.servicioId,
        descripcion: item.descripcion,
        codigo: item.codigo ?? "",
        cantidad: item.cantidad ? String(item.cantidad) : "",
        precio_mostrado: item.precioUnitario ? String(item.precioUnitario) : "",
        incluye_iva: false,
        descuento_porcentaje: item.descuentoPorcentaje ? String(item.descuentoPorcentaje) : "",
        tipo_impuesto: item.tipoImpuesto,
        bodega_id: aplicaInventario ? item.bodegaId : null,
        aplica_inventario: aplicaInventario,
      };
    }));
    for (const item of factura?.items ?? []) {
      if (item.productoId && item.aplicaInventario) void onCargarExistencias(item.productoId);
    }
  }, [abierto, factura]);

  useEffect(() => {
    if (!abierto || factura?.formaPagoId) return;
    setFormaPagoId((actual) => actual ?? formasPago[0]?.id ?? null);
  }, [abierto, factura, formasPago]);

  const buscarClientes = useCallback(async (texto: string): Promise<OpcionBuscador[]> => {
    const termino = texto.trim();
    if (!token || termino.length < MIN_BUSQUEDA) return [];
    const clientes = await listarTodasLasPaginas((page, size) =>
      listarClientes(token, { page, size, search: termino }),
    );
    return clientes.map((cliente) => ({
      id: cliente.id,
      label: cliente.nombres,
      extra: cliente.identificacion ?? "",
    }));
  }, [token]);

  useEffect(() => {
    if (!abierto) return;
    const termino = busqueda.trim();
    if (termino.length < MIN_BUSQUEDA) {
      setProductosHallados([]);
      setServiciosHallados([]);
      setBuscandoItems(false);
      return;
    }
    const timer = setTimeout(async () => {
      setBuscandoItems(true);
      try {
        const [prods, servs] = await Promise.all([
          listarTodasLasPaginas((page, size) =>
            listarProductos(token, { page, size, search: termino, activo: true }),
          ),
          listarTodasLasPaginas((page, size) =>
            listarServicios(token, { page, size, search: termino, activo: true }),
          ),
        ]);
        setProductosHallados(prods);
        setServiciosHallados(servs);
      } catch {
        setProductosHallados([]);
        setServiciosHallados([]);
      } finally {
        setBuscandoItems(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [abierto, busqueda, token]);

  const itemsFiltrados = useMemo(() => {
    const prods = productosHallados.map((p) => ({
      tipo: "producto" as const,
      id: p.id,
      label: p.nombre,
      extra: `${p.codigo} · ${TIPOS_IMPUESTO.find((t) => t.value === p.tipoImpuesto)?.label ?? p.tipoImpuesto} · ${p.aplicaInventario ? `stock ${p.stockTotal}` : "sin inventario"}`,
      precio: p.precioVenta,
    }));
    const servs = serviciosHallados.map((s) => ({
      tipo: "servicio" as const,
      id: s.id,
      label: s.nombre,
      extra: `${s.codigo} · ${TIPOS_IMPUESTO.find((t) => t.value === s.tipoImpuesto)?.label ?? s.tipoImpuesto}`,
      precio: s.precioVenta,
    }));
    return [...prods, ...servs];
  }, [productosHallados, serviciosHallados]);

  const lineasCalc = useMemo(() => lineas.map((linea) => ({ linea, calc: recalc(linea) })), [lineas]);

  const totales = useMemo(() => {
    const buckets = { s15: 0, s5: 0, s0: 0, objeto: 0, exento: 0, iva15: 0, iva5: 0, desc: 0, impuestos: 0, total: 0 };
    for (const { linea, calc } of lineasCalc) {
      buckets.desc = dinero(buckets.desc + calc.descuento);
      buckets.total = dinero(buckets.total + calc.total);
      buckets.impuestos = dinero(buckets.impuestos + calc.iva);
      if (linea.tipo_impuesto === "15") { buckets.s15 = dinero(buckets.s15 + calc.subtotal); buckets.iva15 = dinero(buckets.iva15 + calc.iva); }
      else if (linea.tipo_impuesto === "5") { buckets.s5 = dinero(buckets.s5 + calc.subtotal); buckets.iva5 = dinero(buckets.iva5 + calc.iva); }
      else if (linea.tipo_impuesto === "no_objeto") buckets.objeto = dinero(buckets.objeto + calc.subtotal);
      else if (linea.tipo_impuesto === "exento_iva") buckets.exento = dinero(buckets.exento + calc.subtotal);
      else buckets.s0 = dinero(buckets.s0 + calc.subtotal);
    }
    return buckets;
  }, [lineasCalc]);

  function actualizar(key: string, cambios: Partial<LineaForm>) {
    setLineas((prev) => prev.map((linea) => (linea.key === key ? { ...linea, ...cambios } : linea)));
  }

  async function agregarItem(tipo: "producto" | "servicio", id: number) {
    const producto = tipo === "producto" ? productosHallados.find((p) => p.id === id) : undefined;
    const servicio = tipo === "servicio" ? serviciosHallados.find((s) => s.id === id) : undefined;
    const origen = producto ?? servicio;
    if (!origen) return;
    const key = nuevaKey();
    setLineas((prev) => [...prev, {
      key,
      producto_id: producto?.id ?? null,
      servicio_id: servicio?.id ?? null,
      descripcion: origen.nombre,
      codigo: origen.codigo,
      cantidad: "1",
      precio_mostrado: String(origen.precioVenta),
      incluye_iva: Boolean(origen.aplicaIva && cobraIva(origen.tipoImpuesto)),
      descuento_porcentaje: "",
      tipo_impuesto: origen.tipoImpuesto,
      bodega_id: producto?.aplicaInventario ? (bodegas[0]?.id ?? null) : null,
      aplica_inventario: producto?.aplicaInventario ?? false,
    }]);
    setBusqueda("");
    if (!producto?.aplicaInventario) return;
    try {
      const stocks = (await onCargarExistencias(producto.id)) ?? existencias[producto.id] ?? [];
      const conStock = stocks.find((item) => item.cantidad > 0);
      const bodegaId = conStock?.bodegaId ?? stocks[0]?.bodegaId ?? bodegas[0]?.id ?? null;
      setLineas((prev) => prev.map((linea) => (linea.key === key ? { ...linea, bodega_id: bodegaId } : linea)));
    } catch {
      // se mantiene la primera bodega
    }
  }

  async function submit() {
    const items: ItemFacturaInput[] = lineas.map((linea) => ({
      producto_id: linea.producto_id,
      servicio_id: linea.servicio_id,
      descripcion: linea.descripcion,
      codigo: linea.codigo,
      cantidad: numeroVacio(linea.cantidad) || 0,
      precio_unitario: recalc(linea).precioBase,
      descuento_porcentaje: numeroVacio(linea.descuento_porcentaje),
      aplica_iva: cobraIva(linea.tipo_impuesto),
      tipo_impuesto: linea.tipo_impuesto,
      bodega_id: linea.aplica_inventario ? linea.bodega_id : null,
    }));
    await onSubmit({
      tipo_receptor: tipoReceptor,
      cliente_id: tipoReceptor === "cliente" ? clienteId : null,
      forma_pago_id: formaPagoId,
      fecha_emision: fecha,
      fecha_pago: fechaPago || null,
      notas,
      terminos,
      items,
      orden_trabajo_id: factura?.ordenTrabajoId,
    });
  }

  if (!abierto) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative w-full max-w-[88rem] rounded-t-2xl sm:rounded-2xl bg-card shadow-elegant max-h-[94dvh] overflow-y-auto">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold">{factura ? `Editar ${factura.numero}` : "Nueva factura"}</h2>
              {factura?.estado === "RECHAZADA" && (
                <p className="text-xs text-muted-foreground">Al guardar vuelve a borrador para corregir y reenviar al SRI.</p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <div className="px-6 py-4 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <Label>Receptor</Label>
                <select className="flex h-10 w-full rounded-md border px-3 text-sm bg-background" value={tipoReceptor} onChange={(e) => setTipoReceptor(e.target.value as TipoReceptor)}>
                  <option value="cliente">Cliente</option>
                  <option value="consumidor_final">Consumidor final</option>
                </select>
              </div>
              {tipoReceptor === "cliente" && (
                <div>
                  <Label>Cliente</Label>
                  <BuscadorSelect
                    opciones={[]}
                    valor={clienteId}
                    onChange={setClienteId}
                    onBuscar={buscarClientes}
                    minCaracteres={MIN_BUSQUEDA}
                    opcionFija={factura?.clienteId ? {
                      id: factura.clienteId,
                      label: factura.clienteNombres || "Cliente",
                      extra: factura.clienteIdentificacion ?? "",
                    } : null}
                    placeholder="Buscar cliente (mín. 3)"
                  />
                </div>
              )}
              <div>
                <Label>Forma de pago</Label>
                <select className="flex h-10 w-full rounded-md border px-3 text-sm bg-background" value={formaPagoId ?? ""} onChange={(e) => setFormaPagoId(Number(e.target.value))}>
                  {formasPago.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                </select>
              </div>
              <div><Label>Fecha de emisión</Label><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
              <div><Label>Fecha de pago</Label><Input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} /></div>
            </div>

            <div>
              <Label>Agregar producto o servicio</Label>
              <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Busca por código o nombre (mín. 3)" />
              {busqueda.trim().length > 0 && busqueda.trim().length < MIN_BUSQUEDA && (
                <p className="mt-1 text-xs text-muted-foreground">Escribe al menos {MIN_BUSQUEDA} caracteres</p>
              )}
              {buscandoItems && <p className="mt-1 text-xs text-muted-foreground">Buscando productos y servicios...</p>}
              {busqueda.trim().length >= MIN_BUSQUEDA && !buscandoItems && itemsFiltrados.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">Sin productos ni servicios para esa búsqueda.</p>
              )}
              {itemsFiltrados.length > 0 && (
                <div className="mt-1 rounded-md border bg-background shadow-sm max-h-48 overflow-y-auto">
                  {itemsFiltrados.map((item) => (
                    <button key={`${item.tipo}-${item.id}`} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 flex items-center justify-between gap-3" onClick={() => void agregarItem(item.tipo, item.id)}>
                      <span>
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground"> · {item.extra} · {item.tipo}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-primary">${item.precio.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[820px] table-fixed text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold w-[28%]">Descripción / Bodega</th>
                    <th className="px-2 py-2.5 text-center font-semibold w-[8%]">Cant.</th>
                    <th className="px-2 py-2.5 text-right font-semibold w-[12%]">P. unit</th>
                    <th className="px-2 py-2.5 text-center font-semibold w-[8%]">% Desc</th>
                    <th className="px-2 py-2.5 text-left font-semibold w-[12%]">Impuesto</th>
                    <th className="px-2 py-2.5 text-right font-semibold w-[10%]">Subtotal</th>
                    <th className="px-2 py-2.5 text-right font-semibold w-[8%]">IVA</th>
                    <th className="px-2 py-2.5 text-right font-semibold w-[10%]">Total</th>
                    <th className="w-[4%]" />
                  </tr>
                </thead>
                <tbody>
                  {lineasCalc.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">Todavía no hay ítems. Busca un producto o servicio para agregarlo.</td>
                    </tr>
                  )}
                  {lineasCalc.map(({ linea, calc }, index) => {
                    const aplicaStock = Boolean(linea.producto_id && linea.aplica_inventario);
                    const stock = aplicaStock ? stockBodega(existencias[linea.producto_id ?? 0], linea.bodega_id) : null;
                    const esProducto = Boolean(linea.producto_id);
                    return (
                      <tr key={linea.key} className="border-t align-top hover:bg-primary/5">
                        <td className="px-3 py-3">
                          <p className="font-medium flex items-center gap-2">
                            {esProducto ? <Package className="h-4 w-4 text-primary shrink-0" /> : <Wrench className="h-4 w-4 text-primary shrink-0" />}
                            <span className="text-xs text-muted-foreground">{index + 1}.</span>
                            {linea.descripcion}
                          </p>
                          <p className="pl-6 text-[11px] text-muted-foreground">{linea.codigo || "Sin código"} · {esProducto ? "Producto" : "Servicio"}</p>
                          {aplicaStock ? (
                            <div className="pl-6 mt-1.5 space-y-1">
                              <select className="h-8 w-full max-w-xs rounded-md border px-2 text-xs bg-background" value={linea.bodega_id ?? ""} onChange={(e) => actualizar(linea.key, { bodega_id: e.target.value ? Number(e.target.value) : null })}>
                                <option value="">Seleccionar bodega</option>
                                {bodegas.map((bodega) => {
                                  const qty = (existencias[linea.producto_id ?? 0] ?? []).find((item) => item.bodegaId === bodega.id)?.cantidad;
                                  return <option key={bodega.id} value={bodega.id}>{bodega.nombre}{qty != null ? ` (stock ${qty})` : ""}</option>;
                                })}
                              </select>
                              <p className={cn("text-[11px] uppercase tracking-wide", stock !== null && stock <= 0 ? "text-destructive" : "text-muted-foreground")}>
                                Stock: {stock === null ? "—" : stock}
                              </p>
                            </div>
                          ) : (
                            <div className="pl-6 mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                              <p>Bodega: no aplica</p>
                              {esProducto && <p>Stock: no aplica</p>}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <Input className="h-8 text-center" value={linea.cantidad} onChange={(e) => actualizar(linea.key, { cantidad: e.target.value })} />
                        </td>
                        <td className="px-2 py-3">
                          <Input className="h-8 text-right font-medium" value={linea.precio_mostrado} onChange={(e) => actualizar(linea.key, { precio_mostrado: e.target.value })} />
                          <label className="mt-1 flex items-center justify-end gap-1.5 text-[11px]">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5"
                              checked={linea.incluye_iva}
                              disabled={!cobraIva(linea.tipo_impuesto)}
                              onChange={(e) => actualizar(linea.key, { incluye_iva: e.target.checked })}
                            />
                            Incluye IVA
                          </label>
                          <p className="mt-0.5 text-right text-[10px] text-muted-foreground">Base {calc.precioBase.toFixed(2)}</p>
                        </td>
                        <td className="px-2 py-3">
                          <Input className="h-8 text-center" value={linea.descuento_porcentaje} onChange={(e) => actualizar(linea.key, { descuento_porcentaje: e.target.value })} />
                        </td>
                        <td className="px-2 py-3">
                          <select className="flex h-8 w-full rounded-md border px-2 text-xs bg-background" value={linea.tipo_impuesto} onChange={(e) => actualizar(linea.key, { tipo_impuesto: e.target.value as TipoImpuesto })}>
                            {TIPOS_IMPUESTO.map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-3 text-right font-medium tabular-nums">{calc.subtotal.toFixed(2)}</td>
                        <td className="px-2 py-3 text-right tabular-nums">{calc.iva.toFixed(2)}</td>
                        <td className="px-2 py-3 text-right font-semibold tabular-nums text-primary">{calc.total.toFixed(2)}</td>
                        <td className="px-1 py-3">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setLineas((prev) => prev.filter((item) => item.key !== linea.key))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] items-start">
              <div className="space-y-3">
                <div>
                  <Label>Notas</Label>
                  <textarea className="mt-1 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones internas o para el cliente" />
                </div>
                <div>
                  <Label>Términos y condiciones</Label>
                  <textarea className="mt-1 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" value={terminos} onChange={(e) => setTerminos(e.target.value)} placeholder="Condiciones de la factura" />
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border shadow-sm">
                <div className="flex items-center gap-2 bg-primary px-4 py-3 text-primary-foreground">
                  <Calculator className="h-4 w-4" />
                  <p className="text-sm font-semibold uppercase tracking-wide">Resumen financiero</p>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal gravado 15%</span><span className="font-medium">{totales.s15.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">IVA 15%</span><span className="font-medium">{totales.iva15.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal gravado 5%</span><span className="font-medium">{totales.s5.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">IVA 5%</span><span className="font-medium">{totales.iva5.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">0% / exento / no objeto</span><span className="font-medium">{(totales.s0 + totales.exento + totales.objeto).toFixed(2)}</span></div>
                  <div className="flex justify-between border-y border-dashed py-2 text-destructive"><span>Descuento</span><span>-{totales.desc.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Impuestos</span><span className="font-medium">{totales.impuestos.toFixed(2)}</span></div>
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
                    <span className="text-xs uppercase tracking-wide">Total a pagar</span>
                    <span className="text-xl font-semibold">{totales.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t px-6 py-4">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button disabled={cargando} onClick={() => void submit()}>{cargando ? "Guardando..." : "Guardar borrador"}</Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
