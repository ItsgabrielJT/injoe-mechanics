"use client";

import { AlertTriangle, X } from "lucide-react";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

export interface ConfirmDialogDetail {
  label: string;
  value?: string | number | null;
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  details?: ConfirmDialogDetail[];
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "default";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  details = [],
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "destructive",
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  const visibles = details.filter((item) => item.value !== undefined && item.value !== null && String(item.value).trim() !== "");

  return (
    <Portal>
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={loading ? undefined : onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card shadow-elegant overflow-hidden max-h-[92dvh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 border-b px-4 sm:px-6 py-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                variant === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-tight">{title}</h2>
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={loading}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {visibles.length > 0 && (
          <div className="px-4 sm:px-6 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detalle a eliminar</p>
            <dl className="divide-y rounded-xl border bg-muted/20">
              {visibles.map((item) => (
                <div key={item.label} className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-1 sm:gap-3 px-4 py-2.5 text-sm">
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className="font-medium break-words">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t px-4 sm:px-6 py-4">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button type="button" variant={variant} className="w-full sm:w-auto" onClick={() => void onConfirm()} disabled={loading}>
            {loading ? "Procesando..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
    </Portal>
  );
}
