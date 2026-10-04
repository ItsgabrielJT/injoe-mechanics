"use client";

import { useMemo } from "react";
import { Button } from "@/shared/components/ui/button";
import { Portal } from "@/shared/components/portal";
import { formatoMoneda, type OrdenTrabajo } from "@/modules/ordenes-trabajo/domain/entities";

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

interface Props {
  detalle: OrdenTrabajo | null;
  onClose: () => void;
  soloLectura?: boolean;
  onEditar?: (orden: OrdenTrabajo) => void;
  onCerrar?: (orden: OrdenTrabajo) => void;
  onFacturar?: (orden: OrdenTrabajo) => void;
}

export function OrdenDetalleDialog({ detalle, onClose, soloLectura, onEditar, onCerrar, onFacturar }: Props) {
  const totales = useMemo(() => {
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

  if (!detalle) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative w-full max-w-3xl rounded-t-2xl sm:rounded-2xl bg-card shadow-elegant max-h-[92dvh] overflow-y-auto">
          <div className="flex items-start justify-between gap-3 border-b px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold">{detalle.numero}</h2>
              <p className="text-sm text-muted-foreground">{detalle.estado === "CERRADA" ? "Cerrada" : "En proceso"}</p>
            </div>
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
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
                    <td className="py-2 pr-3">{formatoMoneda(totales.venta)}</td>
                    <td className="py-2 pr-3">{formatoMoneda(totales.costo)}</td>
                    <td className="py-2">{formatoMoneda(totales.utilidad)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          {!soloLectura && detalle.estado === "CERRADA" && !detalle.facturada && onFacturar && (
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button onClick={() => onFacturar(detalle)}>Facturar</Button>
            </div>
          )}
          {!soloLectura && detalle.estado === "EN_PROCESO" && (
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              {onEditar && <Button variant="outline" onClick={() => onEditar(detalle)}>Editar</Button>}
              {onCerrar && <Button onClick={() => onCerrar(detalle)}>Cerrar orden</Button>}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
