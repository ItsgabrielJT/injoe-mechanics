from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import PlainTextResponse

from app.modules.facturacion.application.dto import ContextoTenant
from app.modules.facturacion.application.use_cases.gestionar_facturas import (
    CancelarFacturaUseCase,
    CrearDesdeOrdenUseCase,
    EliminarFacturaUseCase,
    EnviarSriUseCase,
    EstadisticasFacturaUseCase,
    GuardarFacturaUseCase,
    ListarFacturasUseCase,
    ObtenerFacturaUseCase,
)
from app.modules.facturacion.domain.entities import EstadoFactura
from app.modules.facturacion.infrastructure.persistence.repositories import SqlAlchemyFacturaRepository
from app.modules.facturacion.presentation.api.dependencies import (
    get_cancelar,
    get_desde_orden,
    get_eliminar,
    get_enviar,
    get_estadisticas,
    get_factura_repo,
    get_guardar,
    get_listar,
    get_obtener,
    get_tenant,
)
from app.modules.facturacion.presentation.api.schemas import (
    DesdeOrdenRequest,
    EstadisticasDataResponse,
    EstadisticasFacturaResponse,
    FacturaCreateRequest,
    FacturaDataResponse,
    FacturaListResponse,
    FacturaResponse,
    FacturaTotalesResponse,
    FormaPagoResponse,
    FormaPagoSriResponse,
    listar_facturas_query,
)

facturas_router = APIRouter(prefix="/facturas", tags=["facturación"])
formas_pago_router = APIRouter(prefix="/formas-pago", tags=["facturación"])
formas_pago_sri_router = APIRouter(prefix="/formas-pago-sri", tags=["facturación"])


@facturas_router.get("/", response_model=FacturaListResponse)
async def listar_facturas(
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ListarFacturasUseCase, Depends(get_listar)],
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    search: str | None = Query(None),
    estado: EstadoFactura | None = Query(None),
    cliente_id: int | None = Query(None),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
) -> FacturaListResponse:
    query = listar_facturas_query(page, size, search, estado, cliente_id, fecha_desde, fecha_hasta)
    facturas, total = await use_case.execute(query, tenant)
    totales = await use_case.totales(query, tenant)
    pages = (total + size - 1) // size if size else 1
    return FacturaListResponse(
        data=[FacturaResponse.from_domain(factura) for factura in facturas],
        total=total,
        page=page,
        size=size,
        pages=pages,
        totales=FacturaTotalesResponse.from_domain(totales),
    )


@facturas_router.get("/estadisticas", response_model=EstadisticasDataResponse)
async def estadisticas_facturas(
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[EstadisticasFacturaUseCase, Depends(get_estadisticas)],
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    cliente_id: int | None = Query(None),
) -> EstadisticasDataResponse:
    query = listar_facturas_query(1, 1, None, None, cliente_id, fecha_desde, fecha_hasta)
    data = await use_case.execute(query, tenant)
    return EstadisticasDataResponse(data=EstadisticasFacturaResponse.from_domain(data))


@facturas_router.get("/{factura_id}", response_model=FacturaDataResponse)
async def obtener_factura(
    factura_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ObtenerFacturaUseCase, Depends(get_obtener)],
) -> FacturaDataResponse:
    factura = await use_case.execute(factura_id, tenant)
    return FacturaDataResponse(data=FacturaResponse.from_domain(factura), message="Factura obtenida")


@facturas_router.post("/", response_model=FacturaDataResponse, status_code=status.HTTP_201_CREATED)
async def crear_factura(
    request: FacturaCreateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[GuardarFacturaUseCase, Depends(get_guardar)],
) -> FacturaDataResponse:
    factura = await use_case.execute(request.to_command(), tenant)
    return FacturaDataResponse(data=FacturaResponse.from_domain(factura), message="Factura creada")


@facturas_router.put("/{factura_id}", response_model=FacturaDataResponse)
async def actualizar_factura(
    factura_id: int,
    request: FacturaCreateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[GuardarFacturaUseCase, Depends(get_guardar)],
) -> FacturaDataResponse:
    factura = await use_case.execute(request.to_command(factura_id), tenant)
    return FacturaDataResponse(data=FacturaResponse.from_domain(factura), message="Factura actualizada")


@facturas_router.delete("/{factura_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_factura(
    factura_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[EliminarFacturaUseCase, Depends(get_eliminar)],
) -> Response:
    await use_case.execute(factura_id, tenant)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@facturas_router.post("/{factura_id}/cancelar", response_model=FacturaDataResponse)
async def cancelar_factura(
    factura_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[CancelarFacturaUseCase, Depends(get_cancelar)],
) -> FacturaDataResponse:
    factura = await use_case.execute(factura_id, tenant)
    return FacturaDataResponse(data=FacturaResponse.from_domain(factura), message="Factura cancelada")


@facturas_router.post("/{factura_id}/enviar-sri", response_model=FacturaDataResponse)
async def enviar_sri(
    factura_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[EnviarSriUseCase, Depends(get_enviar)],
) -> FacturaDataResponse:
    factura = await use_case.execute(factura_id, tenant)
    return FacturaDataResponse(data=FacturaResponse.from_domain(factura), message="Envío al SRI procesado")


@facturas_router.post("/desde-orden/{orden_id}", response_model=FacturaDataResponse, status_code=status.HTTP_201_CREATED)
async def crear_desde_orden(
    orden_id: int,
    request: DesdeOrdenRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[CrearDesdeOrdenUseCase, Depends(get_desde_orden)],
) -> FacturaDataResponse:
    factura = await use_case.execute(request.to_command(orden_id), tenant)
    return FacturaDataResponse(data=FacturaResponse.from_domain(factura), message="Factura creada desde la orden")


@facturas_router.get("/{factura_id}/xml")
async def descargar_xml(
    factura_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ObtenerFacturaUseCase, Depends(get_obtener)],
) -> PlainTextResponse:
    factura = await use_case.execute(factura_id, tenant)
    return PlainTextResponse(factura.xml_content or "", media_type="application/xml")


@formas_pago_router.get("/")
async def listar_formas_pago(
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    repo: Annotated[SqlAlchemyFacturaRepository, Depends(get_factura_repo)],
) -> dict:
    formas = await repo.listar_formas_pago(tenant.empresa_id, tenant.punto_emision_id)
    return {"data": [FormaPagoResponse.from_domain(forma) for forma in formas], "message": "Formas de pago"}


@formas_pago_sri_router.get("/")
async def listar_formas_pago_sri(
    _: Annotated[ContextoTenant, Depends(get_tenant)],
    repo: Annotated[SqlAlchemyFacturaRepository, Depends(get_factura_repo)],
) -> dict:
    formas = await repo.listar_formas_pago_sri()
    return {"data": [FormaPagoSriResponse.from_domain(forma) for forma in formas], "message": "Formas de pago SRI"}
