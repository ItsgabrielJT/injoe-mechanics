from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from contextlib import asynccontextmanager

from app.modules.acceso.presentation.api.router import router as auth_router
from app.modules.acceso.presentation.api.router import usuarios_router
from app.modules.configuracion.domain.exceptions import (
    DatosEmpresaInvalidos,
    EmpresaNoEncontrada,
    PuntoDuplicado,
    PuntoEnUso,
    PuntoNoEncontrado,
)
from app.modules.configuracion.presentation.api.router import empresa_router, puntos_router
from app.modules.facturacion.domain.exceptions import (
    CertificadoNoConfigurado,
    EnvioSriFallido,
    FacturaNoCancelable,
    FacturaNoEditable,
    FacturaNoEncontrada,
    FacturaSinItems,
    FacturaYaCancelada,
    FormaPagoNoEncontrada,
    OrdenNoFacturable,
    OrdenYaFacturada,
    ReceptorInvalido,
)
from app.modules.facturacion.infrastructure.persistence import models as facturacion_models  # noqa: F401
from app.modules.facturacion.infrastructure.scheduler import detener_scheduler, iniciar_scheduler
from app.modules.facturacion.presentation.api.router import facturas_router, formas_pago_router, formas_pago_sri_router
from app.modules.clientes.domain.exceptions import (
    ClienteNoEncontrado,
    CorreoRequerido,
    IdentificacionDuplicada,
    IdentificacionInvalida,
    NombresRequeridos,
    PlacaDuplicada,
    PlacaRequerida,
    TransferenciaInvalida,
    VehiculoNoEncontrado,
)
from app.modules.clientes.infrastructure.persistence import models as clientes_models  # noqa: F401
from app.modules.clientes.presentation.api.router import clientes_router, vehiculos_router
from app.modules.identidad.infrastructure.persistence import models as identidad_models  # noqa: F401
from app.modules.servicios.domain.exceptions import (
    CodigoDuplicado,
    CodigoInvalido,
    DescripcionExcedida,
    NombreRequerido,
    PesoInvalido,
    PrecioInvalido,
    ServicioNoEncontrado,
    TipoImpuestoRequerido,
)
from app.modules.inventario.domain.exceptions import (
    BodegaDestinoRequerida,
    BodegaInactiva,
    BodegaNoEncontrada,
    CantidadInvalida,
    CategoriaInactiva,
    CategoriaNoEncontrada,
    CategoriaRequerida,
    CodigoBarrasDuplicado,
    CodigoBarrasInvalido,
    CodigoDuplicado as InventarioCodigoDuplicado,
    CodigoRequerido,
    ItemsRequeridos,
    MovimientoNoEncontrado,
    NombreDuplicado,
    NombreRequerido as InventarioNombreRequerido,
    PrecioInvalido as InventarioPrecioInvalido,
    ProductoNoEncontrado,
    RecursoEnUso,
    ProductoSinInventario,
    StockInsuficiente,
    TipoAjusteRequerido,
    TipoImpuestoRequerido as InventarioTipoImpuestoRequerido,
)
from app.modules.inventario.infrastructure.persistence import models as inventario_models  # noqa: F401
from app.modules.inventario.presentation.api.router import (
    bodegas_router,
    categorias_router,
    movimientos_router,
    productos_router,
)
from app.modules.estado_vehiculo.domain.exceptions import HistorialVehiculoNoEncontrado
from app.modules.estado_vehiculo.presentation.api.router import estado_vehiculo_router
from app.modules.ordenes_trabajo.domain.exceptions import (
    BodegaRequerida,
    ItemInvalido,
    OrdenCerrada,
    OrdenNoEncontrada,
    ProveedorRequerido,
    TecnicoNoEncontrado,
    VehiculoNoPertenece,
)
from app.modules.ordenes_trabajo.infrastructure.persistence import models as ordenes_models  # noqa: F401
from app.modules.ordenes_trabajo.presentation.api.router import ordenes_router
from app.modules.proveedores.domain.exceptions import (
    IdentificacionDuplicada as ProveedorIdentificacionDuplicada,
    IdentificacionInvalida as ProveedorIdentificacionInvalida,
    IdentificacionRequerida,
    NombreRequerido as ProveedorNombreRequerido,
    PrecioCompraInvalido,
    ProveedorNoEncontrado,
    RecursoEnUso as ProveedorEnUso,
    RelacionDuplicada,
    RelacionNoEncontrada,
)
from app.modules.proveedores.infrastructure.persistence import models as proveedores_models  # noqa: F401
from app.modules.proveedores.presentation.api.router import (
    producto_precios_router,
    proveedores_router,
    servicio_precios_router,
)
from app.modules.servicios.infrastructure.persistence import models as servicios_models  # noqa: F401
from app.modules.servicios.presentation.api.router import servicios_router
from app.shared.domain.exceptions import (
    CredencialesInvalidas,
    ErrorDeDominio,
    PuntoNoAutorizado,
    SesionSinContexto,
    SinPuntosEmision,
    TokenInvalido,
    UsuarioInactivo,
)

@asynccontextmanager
async def lifespan(_app: FastAPI):
    iniciar_scheduler()
    yield
    detener_scheduler()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
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
    ClienteNoEncontrado: 404,
    VehiculoNoEncontrado: 404,
    HistorialVehiculoNoEncontrado: 404,
    IdentificacionDuplicada: 409,
    PlacaDuplicada: 409,
    IdentificacionInvalida: 400,
    CorreoRequerido: 400,
    NombresRequeridos: 400,
    PlacaRequerida: 400,
    TransferenciaInvalida: 400,
    ServicioNoEncontrado: 404,
    CodigoDuplicado: 409,
    NombreRequerido: 400,
    PrecioInvalido: 400,
    TipoImpuestoRequerido: 400,
    CodigoInvalido: 400,
    DescripcionExcedida: 400,
    PesoInvalido: 400,
    CategoriaNoEncontrada: 404,
    BodegaNoEncontrada: 404,
    ProductoNoEncontrado: 404,
    MovimientoNoEncontrado: 404,
    InventarioCodigoDuplicado: 409,
    CodigoBarrasDuplicado: 409,
    NombreDuplicado: 409,
    RecursoEnUso: 409,
    StockInsuficiente: 409,
    InventarioNombreRequerido: 400,
    CodigoRequerido: 400,
    CodigoBarrasInvalido: 400,
    InventarioPrecioInvalido: 400,
    InventarioTipoImpuestoRequerido: 400,
    CategoriaRequerida: 400,
    CategoriaInactiva: 400,
    BodegaInactiva: 400,
    CantidadInvalida: 400,
    BodegaDestinoRequerida: 400,
    TipoAjusteRequerido: 400,
    ItemsRequeridos: 400,
    ProductoSinInventario: 400,
    ProveedorNoEncontrado: 404,
    ProveedorIdentificacionDuplicada: 409,
    ProveedorIdentificacionInvalida: 400,
    IdentificacionRequerida: 400,
    ProveedorNombreRequerido: 400,
    PrecioCompraInvalido: 400,
    RelacionNoEncontrada: 404,
    RelacionDuplicada: 409,
    ProveedorEnUso: 409,
    OrdenNoEncontrada: 404,
    OrdenCerrada: 409,
    TecnicoNoEncontrado: 400,
    VehiculoNoPertenece: 400,
    ItemInvalido: 400,
    BodegaRequerida: 400,
    ProveedorRequerido: 400,
    EmpresaNoEncontrada: 404,
    PuntoNoEncontrado: 404,
    PuntoDuplicado: 409,
    PuntoEnUso: 409,
    DatosEmpresaInvalidos: 400,
    FacturaNoEncontrada: 404,
    FacturaNoEditable: 409,
    FacturaYaCancelada: 409,
    FacturaNoCancelable: 409,
    FacturaSinItems: 400,
    CertificadoNoConfigurado: 400,
    OrdenNoFacturable: 409,
    OrdenYaFacturada: 409,
    ReceptorInvalido: 400,
    FormaPagoNoEncontrada: 404,
    EnvioSriFallido: 502,
}


@app.exception_handler(ErrorDeDominio)
async def manejar_error_dominio(_request: Request, exc: ErrorDeDominio) -> JSONResponse:
    return JSONResponse(
        status_code=CODIGOS_HTTP.get(type(exc), 400),
        content={"detail": exc.mensaje},
    )


app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(clientes_router, prefix=settings.API_V1_STR)
app.include_router(vehiculos_router, prefix=settings.API_V1_STR)
app.include_router(servicios_router, prefix=settings.API_V1_STR)
app.include_router(categorias_router, prefix=settings.API_V1_STR)
app.include_router(bodegas_router, prefix=settings.API_V1_STR)
app.include_router(productos_router, prefix=settings.API_V1_STR)
app.include_router(movimientos_router, prefix=settings.API_V1_STR)
app.include_router(proveedores_router, prefix=settings.API_V1_STR)
app.include_router(producto_precios_router, prefix=settings.API_V1_STR)
app.include_router(servicio_precios_router, prefix=settings.API_V1_STR)
app.include_router(ordenes_router, prefix=settings.API_V1_STR)
app.include_router(estado_vehiculo_router, prefix=settings.API_V1_STR)
app.include_router(usuarios_router, prefix=settings.API_V1_STR)
app.include_router(empresa_router, prefix=settings.API_V1_STR)
app.include_router(puntos_router, prefix=settings.API_V1_STR)
app.include_router(facturas_router, prefix=settings.API_V1_STR)
app.include_router(formas_pago_router, prefix=settings.API_V1_STR)
app.include_router(formas_pago_sri_router, prefix=settings.API_V1_STR)


@app.get("/salud")
async def salud() -> dict[str, str]:
    return {"estado": "ok", "servicio": settings.APP_NAME}
