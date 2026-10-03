from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.modules.ordenes_trabajo.application.dto import ContextoTenant
from app.modules.ordenes_trabajo.application.use_cases.ordenes import (
    CerrarOrdenUseCase,
    EliminarOrdenUseCase,
    GuardarOrdenUseCase,
    ListarOrdenesUseCase,
    ObtenerOrdenUseCase,
)
from app.modules.ordenes_trabajo.domain.entities import EstadoOrden
from app.modules.ordenes_trabajo.presentation.api.dependencies import (
    get_cerrar_orden_use_case,
    get_eliminar_orden_use_case,
    get_guardar_orden_use_case,
    get_listar_ordenes_use_case,
    get_obtener_orden_use_case,
    get_tenant,
)
from app.modules.facturacion.infrastructure.persistence.repositories import SqlAlchemyFacturaRepository
from app.modules.facturacion.presentation.api.dependencies import get_factura_repo
from app.modules.ordenes_trabajo.domain.entities import OrdenTrabajo
from app.modules.ordenes_trabajo.presentation.api.schemas import (
    OrdenCreateRequest,
    OrdenDataResponse,
    OrdenListResponse,
    OrdenResponse,
    TotalesOrdenesResponse,
    listar_ordenes_query,
)

ordenes_router = APIRouter(prefix="/ordenes-trabajo", tags=["órdenes de trabajo"])


async def _enriquecer_facturas(
    ordenes: list[OrdenTrabajo],
    tenant: ContextoTenant,
    repo: SqlAlchemyFacturaRepository,
) -> list[OrdenTrabajo]:
    ids = [orden.id for orden in ordenes if orden.id]
    mapa = await repo.facturas_por_ordenes(ids, tenant.empresa_id, tenant.punto_emision_id)
    for orden in ordenes:
        factura = mapa.get(orden.id or 0)
        if factura:
            orden.factura_id = factura.id
            orden.factura_numero = factura.numero
            orden.facturada = True
    return ordenes


@ordenes_router.get("/", response_model=OrdenListResponse)
async def listar_ordenes(
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ListarOrdenesUseCase, Depends(get_listar_ordenes_use_case)],
    repo: Annotated[SqlAlchemyFacturaRepository, Depends(get_factura_repo)],
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: str | None = Query(None),
    estado: EstadoOrden | None = Query(None),
    tecnico_id: int | None = Query(None),
) -> OrdenListResponse:
    query = listar_ordenes_query(page, size, search, estado, tecnico_id)
    ordenes, total, totales = await use_case.execute(query, tenant)
    await _enriquecer_facturas(ordenes, tenant, repo)
    pages = (total + size - 1) // size if size else 1
    return OrdenListResponse(
        data=[OrdenResponse.from_domain(item) for item in ordenes],
        total=total,
        page=page,
        size=size,
        pages=pages,
        totales=TotalesOrdenesResponse.from_domain(totales),
    )


@ordenes_router.get("/{orden_id}", response_model=OrdenDataResponse)
async def obtener_orden(
    orden_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ObtenerOrdenUseCase, Depends(get_obtener_orden_use_case)],
    repo: Annotated[SqlAlchemyFacturaRepository, Depends(get_factura_repo)],
) -> OrdenDataResponse:
    orden = await use_case.execute(orden_id, tenant)
    await _enriquecer_facturas([orden], tenant, repo)
    return OrdenDataResponse(data=OrdenResponse.from_domain(orden), message="Orden obtenida")


@ordenes_router.post("/", response_model=OrdenDataResponse, status_code=status.HTTP_201_CREATED)
async def crear_orden(
    request: OrdenCreateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[GuardarOrdenUseCase, Depends(get_guardar_orden_use_case)],
) -> OrdenDataResponse:
    orden = await use_case.execute(request.to_command(), tenant)
    return OrdenDataResponse(data=OrdenResponse.from_domain(orden), message="Orden creada")


@ordenes_router.put("/{orden_id}", response_model=OrdenDataResponse)
async def actualizar_orden(
    orden_id: int,
    request: OrdenCreateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[GuardarOrdenUseCase, Depends(get_guardar_orden_use_case)],
) -> OrdenDataResponse:
    orden = await use_case.execute(request.to_command(orden_id), tenant)
    return OrdenDataResponse(data=OrdenResponse.from_domain(orden), message="Orden actualizada")


@ordenes_router.post("/{orden_id}/cerrar", response_model=OrdenDataResponse)
async def cerrar_orden(
    orden_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[CerrarOrdenUseCase, Depends(get_cerrar_orden_use_case)],
) -> OrdenDataResponse:
    orden = await use_case.execute(orden_id, tenant)
    return OrdenDataResponse(data=OrdenResponse.from_domain(orden), message="Orden cerrada")


@ordenes_router.delete("/{orden_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_orden(
    orden_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[EliminarOrdenUseCase, Depends(get_eliminar_orden_use_case)],
) -> Response:
    await use_case.execute(orden_id, tenant)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
