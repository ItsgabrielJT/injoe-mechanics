"use client";

import { Calculator, Mail, Phone, User, Warehouse, X } from "lucide-react";
import { nombreCliente, type Factura } from "@/modules/facturacion/domain/entities";
import { ChipEstado } from "@/modules/facturacion/presentation/components/chip-estado";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";

function dinero(valor: number): string {
  return `$${valor.toFixed(2)}`;
}

interface Props {
  factura: Factura | null;
  onClose: () => void;
}

export function FacturaDetalleDialog({ factura, onClose }: Props) {
  if (!factura) return null;
  const cliente = nombreCliente(factura);

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl bg-card shadow-elegant sm:rounded-2xl">
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
            <div>
              <h2 className="text-xl font-semibold">Factura #{factura.numero}</h2>
              <p className="text-sm text-muted-foreground">{cliente}</p>
            </div>
            <div className="flex items-center gap-2">
              <ChipEstado estado={factura.estado} />
              <Button variant="ghost" size="icon" title="Cerrar" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="space-y-5 overflow-y-auto px-5 py-5">
            <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
              <div className="space-y-4">
                <section className="rounded-2xl border-2 border-primary/30 bg-primary/10 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><User className="h-4 w-4" /> Cliente</p>
                  <p className="text-lg font-bold uppercase leading-tight">{cliente}</p>
                  <p className="mt-2 text-sm text-muted-foreground">ID: {factura.tipoReceptor === "consumidor_final" ? "9999999999999" : factura.clienteIdentificacion || "—"}</p>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {factura.clienteCorreo || "Sin correo"}</p>
                    <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {factura.clienteTelefono || "Sin teléfono"}</p>
                  </div>
                </section>
                <section className="rounded-2xl border p-4 space-y-3 text-sm">
                  <p className="font-semibold">Detalle de pago</p>
                  <div className="flex justify-between"><span className="text-muted-foreground">Forma de pago</span><span className="font-medium">{factura.formaPagoNombre || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Emisión</span><span>{factura.fechaEmision}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vencimiento</span><span>{factura.fechaVencimiento || "—"}</span></div>
                  {factura.fechaAutorizacion && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Autorización</span><span>{factura.fechaAutorizacion.slice(0, 10)}</span></div>
                  )}
                </section>
              </div>

              <div className="overflow-hidden rounded-2xl border">
                <div className="border-b px-4 py-3 text-sm font-semibold">Ítems de la factura</div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Código</th>
                        <th className="px-3 py-2 text-left">Descripción</th>
                        <th className="px-3 py-2 text-left">Bodega</th>
                        <th className="px-3 py-2 text-right">Cantidad</th>
                        <th className="px-3 py-2 text-right">P. unitario</th>
                        <th className="px-3 py-2 text-right">Desc.</th>
                        <th className="px-3 py-2 text-right">IVA</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {factura.items.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-3 py-2 font-mono text-xs">{item.codigo || "—"}</td>
                          <td className="px-3 py-2">{item.descripcion}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              {item.productoId && item.aplicaInventario ? <Warehouse className="h-3.5 w-3.5" /> : null}
                              {item.productoId
                                ? item.aplicaInventario
                                  ? item.bodegaNombre || "Sin bodega"
                                  : "No aplica"
                                : "Servicio"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{item.cantidad.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{dinero(item.precioUnitario)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{item.descuentoPorcentaje.toFixed(2)}%</td>
                          <td className="px-3 py-2 text-right tabular-nums">{dinero(item.ivaAmount)}</td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">{dinero(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border p-4 space-y-2 text-sm">
                <p className="font-semibold">Desglose de impuestos</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal 15%</span><span>{dinero(factura.subtotal15)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal 5%</span><span>{dinero(factura.subtotal5)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal 0%</span><span>{dinero(factura.subtotal0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">No objeto</span><span>{dinero(factura.subtotalObjeto)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Exento</span><span>{dinero(factura.subtotalExento)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">IVA 15%</span><span>{dinero(factura.iva15)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">IVA 5%</span><span>{dinero(factura.iva5)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">IVA 0%</span><span>{dinero(factura.iva0)}</span></div>
              </section>
              <section className="overflow-hidden rounded-2xl border shadow-sm">
                <div className="flex items-center gap-2 bg-primary px-4 py-3 text-primary-foreground">
                  <Calculator className="h-4 w-4" />
                  <p className="text-sm font-semibold uppercase tracking-wide">Resumen financiero</p>
                </div>
                <div className="space-y-2 p-4 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{dinero(factura.subtotal)}</span></div>
                  <div className="flex justify-between text-destructive"><span>Descuento</span><span>-{dinero(factura.descuento)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Impuestos</span><span>{dinero(factura.iva15 + factura.iva5)}</span></div>
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
                    <span className="text-xs uppercase tracking-wide">Total</span>
                    <span className="text-xl font-semibold">{dinero(factura.total)}</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
