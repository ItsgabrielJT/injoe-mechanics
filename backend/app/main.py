from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.modules.acceso.presentation.api.router import router as auth_router
from app.modules.identidad.infrastructure.persistence import models as identidad_models  # noqa: F401
from app.shared.domain.exceptions import (
    CredencialesInvalidas,
    ErrorDeDominio,
    PuntoNoAutorizado,
    SesionSinContexto,
    SinPuntosEmision,
    TokenInvalido,
    UsuarioInactivo,
)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CODIGOS_HTTP = {
    CredencialesInvalidas: 401,
    TokenInvalido: 401,
    UsuarioInactivo: 403,
    SinPuntosEmision: 403,
    PuntoNoAutorizado: 403,
    SesionSinContexto: 403,
}


@app.exception_handler(ErrorDeDominio)
async def manejar_error_dominio(_request: Request, exc: ErrorDeDominio) -> JSONResponse:
    return JSONResponse(
        status_code=CODIGOS_HTTP.get(type(exc), 400),
        content={"detail": exc.mensaje},
    )


app.include_router(auth_router, prefix=settings.API_V1_STR)


@app.get("/salud")
async def salud() -> dict[str, str]:
    return {"estado": "ok", "servicio": settings.APP_NAME}
