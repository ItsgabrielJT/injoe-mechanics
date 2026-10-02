"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Portal({ children }: { children: ReactNode }) {
  const [destino, setDestino] = useState<HTMLElement | null>(() =>
    typeof document !== "undefined" ? document.body : null,
  );

  useEffect(() => {
    setDestino(document.body);
  }, []);

  if (!destino) {
    return null;
  }

  return createPortal(children, destino);
}
