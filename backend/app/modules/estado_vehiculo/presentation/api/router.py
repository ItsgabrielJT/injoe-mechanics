from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.modules.estado_vehiculo.application.dto import ContextoTenant
from app.modules.estado_vehiculo.application.use_cases.consultar import (
    ListarEstadoVehiculoUseCase,
    ObtenerHistorialVehiculoUseCase,
)
from app.modules.estado_vehiculo.presentation.api.dependencies import (
    get_historial_use_case,
    get_listar_estado_use_case,
    get_tenant,
)
from app.modules.estado_vehiculo.presentation.api.schemas import (
    EstadoVehiculoDataResponse,
    EstadoVehiculoListResponse,
    EstadoVehiculoResponse,
    TotalesEstadoResponse,
    listar_estado_query,
)

estado_vehiculo_router = APIRouter(prefix="/estado-vehiculo", tags=["estado de vehículo"])


@estado_vehiculo_router.get("/", response_model=EstadoVehiculoListResponse)
async def listar_estado_vehiculo(
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ListarEstadoVehiculoUseCase, Depends(get_listar_estado_use_case)],
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=200),
    placa: str | None = Query(None),
    marca: str | None = Query(None),
    modelo: str | None = Query(None),
    cliente: str | None = Query(None),
    identificacion: str | None = Query(None),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
) -> EstadoVehiculoListResponse:
    query = listar_estado_query(page, size, placa, marca, modelo, cliente, identificacion, fecha_desde, fecha_hasta)
    items, total, totales = await use_case.execute(query, tenant)
    pages = (total + size - 1) // size if size else 1
    return EstadoVehiculoListResponse(
        data=[EstadoVehiculoResponse.from_domain(item) for item in items],
        total=total,
        page=page,
        size=size,
        pages=pages,
        totales=TotalesEstadoResponse.from_domain(totales),
    )


@estado_vehiculo_router.get("/{vehiculo_id}", response_model=EstadoVehiculoDataResponse)
async def obtener_historial_vehiculo(
    vehiculo_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ObtenerHistorialVehiculoUseCase, Depends(get_historial_use_case)],
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
) -> EstadoVehiculoDataResponse:
    query = listar_estado_query(1, 1, None, None, None, None, None, fecha_desde, fecha_hasta)
    historial = await use_case.execute(vehiculo_id, query, tenant)
    return EstadoVehiculoDataResponse(data=EstadoVehiculoResponse.from_domain(historial))
