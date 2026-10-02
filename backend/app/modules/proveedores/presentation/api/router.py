from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.modules.proveedores.application.dto import ContextoTenant
from app.modules.proveedores.application.use_cases.precios import (
    EliminarPrecioUseCase,
    ListarPreciosProductoUseCase,
    ListarPreciosServicioUseCase,
    UpsertPrecioUseCase,
)
from app.modules.proveedores.application.use_cases.proveedores import (
    ActualizarProveedorUseCase,
    CambiarEstadoProveedorUseCase,
    CrearProveedorUseCase,
    EliminarProveedorUseCase,
    ListarProveedoresUseCase,
    ObtenerProveedorUseCase,
)
from app.modules.proveedores.presentation.api.dependencies import (
    get_actualizar_proveedor_use_case,
    get_cambiar_estado_proveedor_use_case,
    get_crear_proveedor_use_case,
    get_eliminar_precio_use_case,
    get_eliminar_proveedor_use_case,
    get_listar_precios_producto_use_case,
    get_listar_precios_servicio_use_case,
    get_listar_proveedores_use_case,
    get_obtener_proveedor_use_case,
    get_tenant,
    get_upsert_precio_use_case,
)
from app.modules.proveedores.presentation.api.schemas import (
    PrecioProveedorDataResponse,
    PrecioProveedorListResponse,
    PrecioProveedorRequest,
    PrecioProveedorResponse,
    ProveedorCreateRequest,
    ProveedorDataResponse,
    ProveedorListResponse,
    ProveedorResponse,
    ProveedorUpdateRequest,
    listar_proveedores_query,
)

proveedores_router = APIRouter(prefix="/proveedores", tags=["proveedores"])
producto_precios_router = APIRouter(prefix="/productos", tags=["proveedores"])
servicio_precios_router = APIRouter(prefix="/servicios", tags=["proveedores"])


@proveedores_router.get("/", response_model=ProveedorListResponse)
async def listar_proveedores(
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ListarProveedoresUseCase, Depends(get_listar_proveedores_use_case)],
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=200),
    search: str | None = Query(None),
    activo: bool | None = Query(None),
) -> ProveedorListResponse:
    query = listar_proveedores_query(page, size, search, activo)
    proveedores, total = await use_case.execute(query, tenant)
    pages = (total + size - 1) // size if size else 1
    return ProveedorListResponse(
        data=[ProveedorResponse.from_domain(item) for item in proveedores],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@proveedores_router.get("/{proveedor_id}", response_model=ProveedorDataResponse)
async def obtener_proveedor(
    proveedor_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ObtenerProveedorUseCase, Depends(get_obtener_proveedor_use_case)],
) -> ProveedorDataResponse:
    proveedor = await use_case.execute(proveedor_id, tenant)
    return ProveedorDataResponse(data=ProveedorResponse.from_domain(proveedor), message="Proveedor obtenido")


@proveedores_router.post("/", response_model=ProveedorDataResponse, status_code=status.HTTP_201_CREATED)
async def crear_proveedor(
    request: ProveedorCreateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[CrearProveedorUseCase, Depends(get_crear_proveedor_use_case)],
) -> ProveedorDataResponse:
    proveedor = await use_case.execute(request.to_command(), tenant)
    return ProveedorDataResponse(data=ProveedorResponse.from_domain(proveedor), message="Proveedor creado")


@proveedores_router.put("/{proveedor_id}", response_model=ProveedorDataResponse)
async def actualizar_proveedor(
    proveedor_id: int,
    request: ProveedorUpdateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ActualizarProveedorUseCase, Depends(get_actualizar_proveedor_use_case)],
) -> ProveedorDataResponse:
    proveedor = await use_case.execute(request.to_command(proveedor_id), tenant)
    return ProveedorDataResponse(data=ProveedorResponse.from_domain(proveedor), message="Proveedor actualizado")


@proveedores_router.delete("/{proveedor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_proveedor(
    proveedor_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[EliminarProveedorUseCase, Depends(get_eliminar_proveedor_use_case)],
) -> Response:
    await use_case.execute(proveedor_id, tenant)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@proveedores_router.patch("/{proveedor_id}/activar", response_model=ProveedorDataResponse)
async def activar_proveedor(
    proveedor_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[CambiarEstadoProveedorUseCase, Depends(get_cambiar_estado_proveedor_use_case)],
) -> ProveedorDataResponse:
    proveedor = await use_case.execute(proveedor_id, True, tenant)
    return ProveedorDataResponse(data=ProveedorResponse.from_domain(proveedor), message="Proveedor activado")


@proveedores_router.patch("/{proveedor_id}/desactivar", response_model=ProveedorDataResponse)
async def desactivar_proveedor(
    proveedor_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[CambiarEstadoProveedorUseCase, Depends(get_cambiar_estado_proveedor_use_case)],
) -> ProveedorDataResponse:
    proveedor = await use_case.execute(proveedor_id, False, tenant)
    return ProveedorDataResponse(data=ProveedorResponse.from_domain(proveedor), message="Proveedor desactivado")


@producto_precios_router.get("/{producto_id}/proveedores", response_model=PrecioProveedorListResponse)
async def listar_precios_producto(
    producto_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ListarPreciosProductoUseCase, Depends(get_listar_precios_producto_use_case)],
) -> PrecioProveedorListResponse:
    precios = await use_case.execute(producto_id, tenant)
    return PrecioProveedorListResponse(data=[PrecioProveedorResponse.from_domain(item) for item in precios], total=len(precios))


@producto_precios_router.post("/{producto_id}/proveedores", response_model=PrecioProveedorDataResponse, status_code=status.HTTP_201_CREATED)
async def upsert_precio_producto(
    producto_id: int,
    request: PrecioProveedorRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[UpsertPrecioUseCase, Depends(get_upsert_precio_use_case)],
) -> PrecioProveedorDataResponse:
    precio = await use_case.execute(request.to_command(producto_id=producto_id), tenant)
    return PrecioProveedorDataResponse(data=PrecioProveedorResponse.from_domain(precio), message="Precio de compra guardado")


@producto_precios_router.put("/{producto_id}/proveedores/{relacion_id}", response_model=PrecioProveedorDataResponse)
async def actualizar_precio_producto(
    producto_id: int,
    relacion_id: int,
    request: PrecioProveedorRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[UpsertPrecioUseCase, Depends(get_upsert_precio_use_case)],
) -> PrecioProveedorDataResponse:
    precio = await use_case.execute(request.to_command(producto_id=producto_id, relacion_id=relacion_id), tenant)
    return PrecioProveedorDataResponse(data=PrecioProveedorResponse.from_domain(precio), message="Precio actualizado")


@producto_precios_router.delete("/{producto_id}/proveedores/{relacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_precio_producto(
    producto_id: int,
    relacion_id: int,
    use_case: Annotated[EliminarPrecioUseCase, Depends(get_eliminar_precio_use_case)],
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
) -> Response:
    del tenant
    await use_case.execute(relacion_id, producto_id, True)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@servicio_precios_router.get("/{servicio_id}/proveedores", response_model=PrecioProveedorListResponse)
async def listar_precios_servicio(
    servicio_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ListarPreciosServicioUseCase, Depends(get_listar_precios_servicio_use_case)],
) -> PrecioProveedorListResponse:
    precios = await use_case.execute(servicio_id, tenant)
    return PrecioProveedorListResponse(data=[PrecioProveedorResponse.from_domain(item) for item in precios], total=len(precios))


@servicio_precios_router.post("/{servicio_id}/proveedores", response_model=PrecioProveedorDataResponse, status_code=status.HTTP_201_CREATED)
async def upsert_precio_servicio(
    servicio_id: int,
    request: PrecioProveedorRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[UpsertPrecioUseCase, Depends(get_upsert_precio_use_case)],
) -> PrecioProveedorDataResponse:
    precio = await use_case.execute(request.to_command(servicio_id=servicio_id), tenant)
    return PrecioProveedorDataResponse(data=PrecioProveedorResponse.from_domain(precio), message="Precio de compra guardado")


@servicio_precios_router.put("/{servicio_id}/proveedores/{relacion_id}", response_model=PrecioProveedorDataResponse)
async def actualizar_precio_servicio(
    servicio_id: int,
    relacion_id: int,
    request: PrecioProveedorRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[UpsertPrecioUseCase, Depends(get_upsert_precio_use_case)],
) -> PrecioProveedorDataResponse:
    precio = await use_case.execute(request.to_command(servicio_id=servicio_id, relacion_id=relacion_id), tenant)
    return PrecioProveedorDataResponse(data=PrecioProveedorResponse.from_domain(precio), message="Precio actualizado")


@servicio_precios_router.delete("/{servicio_id}/proveedores/{relacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_precio_servicio(
    servicio_id: int,
    relacion_id: int,
    use_case: Annotated[EliminarPrecioUseCase, Depends(get_eliminar_precio_use_case)],
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
) -> Response:
    del tenant
    await use_case.execute(relacion_id, servicio_id, False)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
