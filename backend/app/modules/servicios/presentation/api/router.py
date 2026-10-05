from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.modules.servicios.application.dto import ContextoTenant
from app.modules.servicios.application.use_cases.actualizar_servicio import ActualizarServicioUseCase
from app.modules.servicios.application.use_cases.crear_servicio import CrearServicioUseCase
from app.modules.servicios.application.use_cases.eliminar_servicio import EliminarServicioUseCase
from app.modules.servicios.application.use_cases.listar_servicios import ListarServiciosUseCase
from app.modules.servicios.application.use_cases.obtener_servicio import ObtenerServicioUseCase
from app.modules.servicios.domain.entities import CategoriaServicio
from app.modules.servicios.presentation.api.dependencies import (
    get_actualizar_servicio_use_case,
    get_crear_servicio_use_case,
    get_eliminar_servicio_use_case,
    get_listar_servicios_use_case,
    get_obtener_servicio_use_case,
    get_tenant,
)
from app.modules.servicios.presentation.api.schemas import (
    ServicioCreateRequest,
    ServicioDataResponse,
    ServicioListResponse,
    ServicioResponse,
    ServicioUpdateRequest,
    listar_servicios_query,
)

servicios_router = APIRouter(prefix="/servicios", tags=["servicios"])


@servicios_router.get("/", response_model=ServicioListResponse)
async def listar_servicios(
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ListarServiciosUseCase, Depends(get_listar_servicios_use_case)],
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    search: str | None = Query(None),
    categoria: CategoriaServicio | None = Query(None),
    activo: bool | None = Query(None),
) -> ServicioListResponse:
    query = listar_servicios_query(page, size, search, categoria, activo)
    servicios, total = await use_case.execute(query, tenant)
    pages = (total + size - 1) // size if size else 1
    return ServicioListResponse(
        data=[ServicioResponse.from_domain(servicio) for servicio in servicios],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@servicios_router.get("/{servicio_id}", response_model=ServicioDataResponse)
async def obtener_servicio(
    servicio_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ObtenerServicioUseCase, Depends(get_obtener_servicio_use_case)],
) -> ServicioDataResponse:
    servicio = await use_case.execute(servicio_id, tenant)
    return ServicioDataResponse(data=ServicioResponse.from_domain(servicio), message="Servicio obtenido")


@servicios_router.post("/", response_model=ServicioDataResponse, status_code=status.HTTP_201_CREATED)
async def crear_servicio(
    request: ServicioCreateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[CrearServicioUseCase, Depends(get_crear_servicio_use_case)],
) -> ServicioDataResponse:
    servicio = await use_case.execute(request.to_command(), tenant)
    return ServicioDataResponse(data=ServicioResponse.from_domain(servicio), message="Servicio creado exitosamente")


@servicios_router.put("/{servicio_id}", response_model=ServicioDataResponse)
async def actualizar_servicio(
    servicio_id: int,
    request: ServicioUpdateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ActualizarServicioUseCase, Depends(get_actualizar_servicio_use_case)],
) -> ServicioDataResponse:
    servicio = await use_case.execute(request.to_command(servicio_id), tenant)
    return ServicioDataResponse(data=ServicioResponse.from_domain(servicio), message="Servicio actualizado")


@servicios_router.delete("/{servicio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_servicio(
    servicio_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[EliminarServicioUseCase, Depends(get_eliminar_servicio_use_case)],
) -> Response:
    await use_case.execute(servicio_id, tenant)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
