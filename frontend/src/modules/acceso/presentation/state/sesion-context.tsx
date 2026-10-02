"use client";

import { createContext, useContext } from "react";
import { useSesion } from "@/modules/acceso/presentation/hooks/use-sesion";

type SesionContextValue = ReturnType<typeof useSesion>;

const SesionContext = createContext<SesionContextValue | null>(null);

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const value = useSesion();
  return <SesionContext.Provider value={value}>{children}</SesionContext.Provider>;
}

export function useSesionContext() {
  const context = useContext(SesionContext);
  if (!context) {
    throw new Error("useSesionContext debe usarse dentro de SesionProvider");
  }
  return context;
}
