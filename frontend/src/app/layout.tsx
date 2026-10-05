import type { Metadata } from "next";
import { AuthGuard } from "@/modules/acceso/presentation/guards/auth-guard";
import { SesionProvider } from "@/modules/acceso/presentation/state/sesion-context";
import { DESCRIPCION_SISTEMA, LOGO_SISTEMA, NOMBRE_SISTEMA } from "@/shared/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: NOMBRE_SISTEMA,
  description: DESCRIPCION_SISTEMA,
  applicationName: NOMBRE_SISTEMA,
  icons: {
    icon: [{ url: LOGO_SISTEMA, type: "image/png" }],
    shortcut: LOGO_SISTEMA,
    apple: LOGO_SISTEMA,
  },
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" translate="no" className="notranslate">
      <body className="notranslate">
        <SesionProvider>
          <AuthGuard>{children}</AuthGuard>
        </SesionProvider>
      </body>
    </html>
  );
}
