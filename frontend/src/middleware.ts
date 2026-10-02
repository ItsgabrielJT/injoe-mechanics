import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "mecanicos.auth";
const RUTAS_PUBLICAS = new Set(["/login"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const autenticado = request.cookies.get(AUTH_COOKIE)?.value === "1";
  const esPublica = RUTAS_PUBLICAS.has(pathname);

  if (pathname === "/") {
    const destino = request.nextUrl.clone();
    destino.pathname = autenticado ? "/dashboard" : "/login";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  if (!autenticado && !esPublica) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logos/|.*\\..*).*)"],
};
