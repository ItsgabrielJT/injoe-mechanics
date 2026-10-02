from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.modules.clientes.application.dto import ContextoTenant
from app.modules.clientes.application.use_cases.alta_rapida import AltaRapidaClienteVehiculoUseCase
from app.modules.clientes.application.use_cases.actualizar_cliente import ActualizarClienteUseCase
from app.modules.clientes.application.use_cases.actualizar_vehiculo import ActualizarVehiculoUseCase
from app.modules.clientes.application.use_cases.crear_cliente import CrearClienteUseCase
from app.modules.clientes.application.use_cases.crear_vehiculo import CrearVehiculoUseCase
from app.modules.clientes.application.use_cases.eliminar_cliente import EliminarClienteUseCase
from app.modules.clientes.application.use_cases.eliminar_vehiculo import EliminarVehiculoUseCase
from app.modules.clientes.application.use_cases.listar_clientes import ListarClientesUseCase
from app.modules.clientes.application.use_cases.listar_vehiculos import ListarVehiculosClienteUseCase, ListarVehiculosUseCase
from app.modules.clientes.application.use_cases.obtener_cliente import ObtenerClienteUseCase
from app.modules.clientes.application.use_cases.obtener_vehiculo import ObtenerVehiculoUseCase
from app.modules.clientes.domain.entities import TipoCliente
from app.modules.clientes.presentation.api.dependencies import (
    get_alta_rapida_use_case,
    get_actualizar_cliente_use_case,
    get_actualizar_vehiculo_use_case,
    get_crear_cliente_use_case,
    get_crear_vehiculo_use_case,
    get_eliminar_cliente_use_case,
    get_eliminar_vehiculo_use_case,
    get_listar_clientes_use_case,
    get_listar_vehiculos_cliente_use_case,
    get_listar_vehiculos_use_case,
    get_obtener_cliente_use_case,
    get_obtener_vehiculo_use_case,
    get_tenant,
)
from app.modules.clientes.presentation.api.schemas import (
    AltaRapidaRequest,
    AltaRapidaResponse,
    ClienteCreateRequest,
    ClienteListResponse,
    ClienteResponse,
    ClienteUpdateRequest,
    ClienteDataResponse,
    VehiculoDataResponse,
    VehiculoCreateRequest,
    VehiculoListResponse,
    VehiculoResponse,
    VehiculoUpdateRequest,
    listar_clientes_query,
    listar_vehiculos_query,
)

clientes_router = APIRouter(prefix="/clientes", tags=["clientes"])
vehiculos_router = APIRouter(prefix="/vehiculos", tags=["vehículos"])


@clientes_router.get("/", response_model=ClienteListResponse)
async def listar_clientes(
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ListarClientesUseCase, Depends(get_listar_clientes_use_case)],
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: str | None = Query(None),
    tipo_cliente: TipoCliente | None = Query(None),
    activo: bool | None = Query(None),
) -> ClienteListResponse:
    query = listar_clientes_query(page, size, search, tipo_cliente, activo)
    clientes, total = await use_case.execute(query, tenant)
    pages = (total + size - 1) // size if size else 1
    return ClienteListResponse(
        data=[ClienteResponse.from_domain(cliente) for cliente in clientes],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@clientes_router.post("/alta-rapida", response_model=AltaRapidaResponse, status_code=status.HTTP_201_CREATED)
async def alta_rapida(
    request: AltaRapidaRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[AltaRapidaClienteVehiculoUseCase, Depends(get_alta_rapida_use_case)],
) -> AltaRapidaResponse:
    cliente, vehiculo = await use_case.execute(request.to_command(), tenant)
    return AltaRapidaResponse(
        data={
            "cliente": ClienteResponse.from_domain(cliente).model_dump(mode="json"),
            "vehiculo": VehiculoResponse.from_domain(vehiculo).model_dump(mode="json"),
        },
        message="Cliente y vehículo listos para la orden",
    )


@clientes_router.get("/{cliente_id}", response_model=ClienteDataResponse)
async def obtener_cliente(
    cliente_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ObtenerClienteUseCase, Depends(get_obtener_cliente_use_case)],
) -> ClienteDataResponse:
    cliente = await use_case.execute(cliente_id, tenant)
    return ClienteDataResponse(data=ClienteResponse.from_domain(cliente), message="Cliente obtenido")


@clientes_router.post("/", response_model=ClienteDataResponse, status_code=status.HTTP_201_CREATED)
async def crear_cliente(
    request: ClienteCreateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[CrearClienteUseCase, Depends(get_crear_cliente_use_case)],
) -> ClienteDataResponse:
    cliente = await use_case.execute(request.to_command(), tenant)
    return ClienteDataResponse(data=ClienteResponse.from_domain(cliente), message="Cliente creado exitosamente")


@clientes_router.put("/{cliente_id}", response_model=ClienteDataResponse)
async def actualizar_cliente(
    cliente_id: int,
    request: ClienteUpdateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ActualizarClienteUseCase, Depends(get_actualizar_cliente_use_case)],
) -> ClienteDataResponse:
    cliente = await use_case.execute(request.to_command(cliente_id), tenant)
    return ClienteDataResponse(data=ClienteResponse.from_domain(cliente), message="Cliente actualizado")


@clientes_router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_cliente(
    cliente_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[EliminarClienteUseCase, Depends(get_eliminar_cliente_use_case)],
) -> Response:
    await use_case.execute(cliente_id, tenant)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@clientes_router.get("/{cliente_id}/vehiculos", response_model=VehiculoListResponse)
async def listar_vehiculos_cliente(
    cliente_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ListarVehiculosClienteUseCase, Depends(get_listar_vehiculos_cliente_use_case)],
) -> VehiculoListResponse:
    vehiculos = await use_case.execute(cliente_id, tenant)
    return VehiculoListResponse(
        data=[VehiculoResponse.from_domain(vehiculo) for vehiculo in vehiculos],
        total=len(vehiculos),
        page=1,
        size=len(vehiculos) or 1,
        pages=1,
        message="Vehículos del cliente",
    )


@vehiculos_router.get("/", response_model=VehiculoListResponse)
async def listar_vehiculos(
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ListarVehiculosUseCase, Depends(get_listar_vehiculos_use_case)],
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: str | None = Query(None),
    cliente_id: int | None = Query(None),
) -> VehiculoListResponse:
    query = listar_vehiculos_query(page, size, search, cliente_id)
    vehiculos, total = await use_case.execute(query, tenant)
    pages = (total + size - 1) // size if size else 1
    return VehiculoListResponse(
        data=[VehiculoResponse.from_domain(vehiculo) for vehiculo in vehiculos],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@vehiculos_router.get("/{vehiculo_id}", response_model=VehiculoDataResponse)
async def obtener_vehiculo(
    vehiculo_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ObtenerVehiculoUseCase, Depends(get_obtener_vehiculo_use_case)],
) -> VehiculoDataResponse:
    vehiculo = await use_case.execute(vehiculo_id, tenant)
    return VehiculoDataResponse(data=VehiculoResponse.from_domain(vehiculo), message="Vehículo obtenido")


@vehiculos_router.post("/", response_model=VehiculoDataResponse, status_code=status.HTTP_201_CREATED)
async def crear_vehiculo(
    request: VehiculoCreateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[CrearVehiculoUseCase, Depends(get_crear_vehiculo_use_case)],
) -> VehiculoDataResponse:
    vehiculo = await use_case.execute(request.to_command(), tenant)
    return VehiculoDataResponse(data=VehiculoResponse.from_domain(vehiculo), message="Vehículo creado exitosamente")


@vehiculos_router.put("/{vehiculo_id}", response_model=VehiculoDataResponse)
async def actualizar_vehiculo(
    vehiculo_id: int,
    request: VehiculoUpdateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ActualizarVehiculoUseCase, Depends(get_actualizar_vehiculo_use_case)],
) -> VehiculoDataResponse:
    vehiculo = await use_case.execute(request.to_command(vehiculo_id), tenant)
    return VehiculoDataResponse(data=VehiculoResponse.from_domain(vehiculo), message="Vehículo actualizado")


@vehiculos_router.delete("/{vehiculo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_vehiculo(
    vehiculo_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[EliminarVehiculoUseCase, Depends(get_eliminar_vehiculo_use_case)],
) -> Response:
    await use_case.execute(vehiculo_id, tenant)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
