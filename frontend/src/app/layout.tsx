import type { Metadata } from "next";
import { SesionProvider } from "@/modules/acceso/presentation/state/sesion-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "INJOE Mecánicos",
  description: "Sistema de talleres y puntos de emisión",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SesionProvider>{children}</SesionProvider>
      </body>
    </html>
  );
}
