import { Loader2 } from "lucide-react";
import { claseChipEstado, etiquetaEstado, type EstadoFactura } from "@/modules/facturacion/domain/entities";
import { cn } from "@/shared/lib/utils";

interface Props {
  estado: EstadoFactura;
  enviando?: boolean;
}

export function ChipEstado({ estado, enviando }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", claseChipEstado(estado))}>
      {enviando && <Loader2 className="h-3 w-3 animate-spin" />}
      {enviando ? "Enviando" : etiquetaEstado(estado)}
    </span>
  );
}
