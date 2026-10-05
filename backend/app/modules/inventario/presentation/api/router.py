from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.modules.inventario.application.dto import ContextoTenant
from app.modules.inventario.application.use_cases.bodegas import (
    ActualizarBodegaUseCase,
    CrearBodegaUseCase,
    EliminarBodegaUseCase,
    ListarBodegasUseCase,
    ObtenerBodegaUseCase,
)
from app.modules.inventario.application.use_cases.categorias import (
    ActualizarCategoriaUseCase,
    CrearCategoriaUseCase,
    EliminarCategoriaUseCase,
    ListarCategoriasUseCase,
    ObtenerCategoriaUseCase,
)
from app.modules.inventario.application.use_cases.consultas import (
    ListarAlertasUseCase,
    ListarExistenciasUseCase,
    ListarKardexUseCase,
    ReporteMovimientosUseCase,
    ReporteProductosUseCase,
)
from app.modules.inventario.application.use_cases.movimientos import (
    ListarMovimientosUseCase,
    ObtenerMovimientoUseCase,
    RegistrarMovimientoUseCase,
)
from app.modules.inventario.application.use_cases.productos import (
    ActualizarProductoUseCase,
    CrearProductoUseCase,
    EliminarProductoUseCase,
    ListarProductosUseCase,
    ObtenerProductoUseCase,
)
from app.modules.inventario.domain.entities import TipoMovimiento
from app.modules.inventario.presentation.api.dependencies import (
    get_actualizar_bodega_use_case,
    get_actualizar_categoria_use_case,
    get_actualizar_producto_use_case,
    get_crear_bodega_use_case,
    get_crear_categoria_use_case,
    get_crear_producto_use_case,
    get_eliminar_bodega_use_case,
    get_eliminar_categoria_use_case,
    get_eliminar_producto_use_case,
    get_listar_alertas_use_case,
    get_listar_bodegas_use_case,
    get_listar_categorias_use_case,
    get_listar_existencias_use_case,
    get_listar_kardex_use_case,
    get_listar_movimientos_use_case,
    get_listar_productos_use_case,
    get_obtener_bodega_use_case,
    get_obtener_categoria_use_case,
    get_obtener_movimiento_use_case,
    get_obtener_producto_use_case,
    get_registrar_movimiento_use_case,
    get_reporte_movimientos_use_case,
    get_reporte_productos_use_case,
    get_tenant,
)
from app.modules.inventario.presentation.api.schemas import (
    AlertaResponse,
    BodegaCreateRequest,
    BodegaDataResponse,
    BodegaListResponse,
    BodegaResponse,
    BodegaUpdateRequest,
    CategoriaCreateRequest,
    CategoriaDataResponse,
    CategoriaListResponse,
    CategoriaResponse,
    CategoriaUpdateRequest,
    ExistenciaResponse,
    KardexItemResponse,
    MovimientoCreateRequest,
    MovimientoDataResponse,
    MovimientoListResponse,
    MovimientoResponse,
    ProductoCreateRequest,
    ProductoDataResponse,
    ProductoListResponse,
    ProductoReporteResponse,
    ProductoResponse,
    ProductoUpdateRequest,
    listar_catalogo_query,
    listar_movimientos_query,
    listar_productos_query,
    listar_reporte_productos_query,
    paginas,
)

categorias_router = APIRouter(prefix="/categorias-producto", tags=["inventario"])
bodegas_router = APIRouter(prefix="/bodegas", tags=["inventario"])
productos_router = APIRouter(prefix="/productos", tags=["inventario"])
movimientos_router = APIRouter(prefix="/movimientos-inventario", tags=["inventario"])


@categorias_router.get("/", response_model=CategoriaListResponse)
async def listar_categorias(
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ListarCategoriasUseCase, Depends(get_listar_categorias_use_case)],
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=200),
    search: str | None = Query(None),
    activo: bool | None = Query(None),
) -> CategoriaListResponse:
    categorias, total = await use_case.execute(listar_catalogo_query(page, size, search, activo), tenant)
    return CategoriaListResponse(
        data=[CategoriaResponse.from_domain(item) for item in categorias],
        total=total,
        page=page,
        size=size,
        pages=paginas(total, size),
        message="Lista de categorías obtenida",
    )


@categorias_router.get("/{categoria_id}", response_model=CategoriaDataResponse)
async def obtener_categoria(
    categoria_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ObtenerCategoriaUseCase, Depends(get_obtener_categoria_use_case)],
) -> CategoriaDataResponse:
    categoria = await use_case.execute(categoria_id, tenant)
    return CategoriaDataResponse(data=CategoriaResponse.from_domain(categoria), message="Categoría obtenida")


@categorias_router.post("/", response_model=CategoriaDataResponse, status_code=status.HTTP_201_CREATED)
async def crear_categoria(
    request: CategoriaCreateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[CrearCategoriaUseCase, Depends(get_crear_categoria_use_case)],
) -> CategoriaDataResponse:
    categoria = await use_case.execute(request.to_command(), tenant)
    return CategoriaDataResponse(data=CategoriaResponse.from_domain(categoria), message="Categoría creada")


@categorias_router.put("/{categoria_id}", response_model=CategoriaDataResponse)
async def actualizar_categoria(
    categoria_id: int,
    request: CategoriaUpdateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ActualizarCategoriaUseCase, Depends(get_actualizar_categoria_use_case)],
) -> CategoriaDataResponse:
    categoria = await use_case.execute(request.to_command(categoria_id), tenant)
    return CategoriaDataResponse(data=CategoriaResponse.from_domain(categoria), message="Categoría actualizada")


@categorias_router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_categoria(
    categoria_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[EliminarCategoriaUseCase, Depends(get_eliminar_categoria_use_case)],
) -> Response:
    await use_case.execute(categoria_id, tenant)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@bodegas_router.get("/", response_model=BodegaListResponse)
async def listar_bodegas(
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ListarBodegasUseCase, Depends(get_listar_bodegas_use_case)],
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=200),
    search: str | None = Query(None),
    activo: bool | None = Query(None),
) -> BodegaListResponse:
    bodegas, total = await use_case.execute(listar_catalogo_query(page, size, search, activo), tenant)
    return BodegaListResponse(
        data=[BodegaResponse.from_domain(item) for item in bodegas],
        total=total,
        page=page,
        size=size,
        pages=paginas(total, size),
        message="Lista de bodegas obtenida",
    )


@bodegas_router.get("/{bodega_id}", response_model=BodegaDataResponse)
async def obtener_bodega(
    bodega_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ObtenerBodegaUseCase, Depends(get_obtener_bodega_use_case)],
) -> BodegaDataResponse:
    bodega = await use_case.execute(bodega_id, tenant)
    return BodegaDataResponse(data=BodegaResponse.from_domain(bodega), message="Bodega obtenida")


@bodegas_router.post("/", response_model=BodegaDataResponse, status_code=status.HTTP_201_CREATED)
async def crear_bodega(
    request: BodegaCreateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[CrearBodegaUseCase, Depends(get_crear_bodega_use_case)],
) -> BodegaDataResponse:
    bodega = await use_case.execute(request.to_command(), tenant)
    return BodegaDataResponse(data=BodegaResponse.from_domain(bodega), message="Bodega creada")


@bodegas_router.put("/{bodega_id}", response_model=BodegaDataResponse)
async def actualizar_bodega(
    bodega_id: int,
    request: BodegaUpdateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ActualizarBodegaUseCase, Depends(get_actualizar_bodega_use_case)],
) -> BodegaDataResponse:
    bodega = await use_case.execute(request.to_command(bodega_id), tenant)
    return BodegaDataResponse(data=BodegaResponse.from_domain(bodega), message="Bodega actualizada")


@bodegas_router.delete("/{bodega_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_bodega(
    bodega_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[EliminarBodegaUseCase, Depends(get_eliminar_bodega_use_case)],
) -> Response:
    await use_case.execute(bodega_id, tenant)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@productos_router.get("/", response_model=ProductoListResponse)
async def listar_productos(
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ListarProductosUseCase, Depends(get_listar_productos_use_case)],
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    search: str | None = Query(None),
    categoria_id: int | None = Query(None),
    activo: bool | None = Query(None),
    aplica_inventario: bool | None = Query(None),
) -> ProductoListResponse:
    productos, total = await use_case.execute(
        listar_productos_query(page, size, search, categoria_id, activo, aplica_inventario), tenant
    )
    return ProductoListResponse(
        data=[ProductoResponse.from_domain(item) for item in productos],
        total=total,
        page=page,
        size=size,
        pages=paginas(total, size),
        message="Lista de productos obtenida",
    )


@productos_router.get("/alertas")
async def listar_alertas(
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ListarAlertasUseCase, Depends(get_listar_alertas_use_case)],
) -> dict:
    alertas = await use_case.execute(tenant)
    return {"data": [AlertaResponse.from_domain(item) for item in alertas], "message": "Alertas obtenidas"}


@productos_router.get("/reporte")
async def reporte_productos(
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ReporteProductosUseCase, Depends(get_reporte_productos_use_case)],
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    producto_ids: list[int] | None = Query(None),
    bodega_ids: list[int] | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
) -> dict:
    filas, total = await use_case.execute(
        listar_reporte_productos_query(page, size, producto_ids, bodega_ids, fecha_desde, fecha_hasta),
        tenant,
    )
    return {
        "data": [
            ProductoReporteResponse(
                producto=ProductoResponse.from_domain(fila.producto),
                kardex=[KardexItemResponse.from_domain(item) for item in fila.kardex],
                existencias=[ExistenciaResponse.from_domain(item) for item in fila.existencias],
                stock_corte=fila.stock_corte,
            ).model_dump()
            for fila in filas
        ],
        "total": total,
        "page": page,
        "size": size,
        "pages": paginas(total, size),
        "message": "Reporte de productos obtenido",
    }


@productos_router.get("/{producto_id}", response_model=ProductoDataResponse)
async def obtener_producto(
    producto_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ObtenerProductoUseCase, Depends(get_obtener_producto_use_case)],
) -> ProductoDataResponse:
    producto = await use_case.execute(producto_id, tenant)
    return ProductoDataResponse(data=ProductoResponse.from_domain(producto), message="Producto obtenido")


@productos_router.get("/{producto_id}/existencias")
async def listar_existencias(
    producto_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ListarExistenciasUseCase, Depends(get_listar_existencias_use_case)],
) -> dict:
    existencias = await use_case.execute(producto_id, tenant)
    return {
        "data": [ExistenciaResponse.from_domain(item) for item in existencias],
        "message": "Existencias obtenidas",
    }


@productos_router.get("/{producto_id}/kardex")
async def listar_kardex(
    producto_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ListarKardexUseCase, Depends(get_listar_kardex_use_case)],
) -> dict:
    kardex = await use_case.execute(producto_id, tenant)
    return {"data": [KardexItemResponse.from_domain(item) for item in kardex], "message": "Kardex obtenido"}


@productos_router.post("/", response_model=ProductoDataResponse, status_code=status.HTTP_201_CREATED)
async def crear_producto(
    request: ProductoCreateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[CrearProductoUseCase, Depends(get_crear_producto_use_case)],
) -> ProductoDataResponse:
    producto = await use_case.execute(request.to_command(), tenant)
    return ProductoDataResponse(data=ProductoResponse.from_domain(producto), message="Producto creado")


@productos_router.put("/{producto_id}", response_model=ProductoDataResponse)
async def actualizar_producto(
    producto_id: int,
    request: ProductoUpdateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ActualizarProductoUseCase, Depends(get_actualizar_producto_use_case)],
) -> ProductoDataResponse:
    producto = await use_case.execute(request.to_command(producto_id), tenant)
    return ProductoDataResponse(data=ProductoResponse.from_domain(producto), message="Producto actualizado")


@productos_router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_producto(
    producto_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[EliminarProductoUseCase, Depends(get_eliminar_producto_use_case)],
) -> Response:
    await use_case.execute(producto_id, tenant)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@movimientos_router.get("/", response_model=MovimientoListResponse)
async def listar_movimientos(
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ListarMovimientosUseCase, Depends(get_listar_movimientos_use_case)],
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=200),
    producto_ids: list[int] | None = Query(None),
    bodega_ids: list[int] | None = Query(None),
    tipo: TipoMovimiento | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
) -> MovimientoListResponse:
    movimientos, total = await use_case.execute(
        listar_movimientos_query(page, size, producto_ids, bodega_ids, tipo, fecha_desde, fecha_hasta),
        tenant,
    )
    return MovimientoListResponse(
        data=[MovimientoResponse.from_domain(item) for item in movimientos],
        total=total,
        page=page,
        size=size,
        pages=paginas(total, size),
        message="Lista de movimientos obtenida",
    )


@movimientos_router.get("/reporte")
async def reporte_movimientos(
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ReporteMovimientosUseCase, Depends(get_reporte_movimientos_use_case)],
    producto_ids: list[int] | None = Query(None),
    bodega_ids: list[int] | None = Query(None),
    tipo: TipoMovimiento | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
) -> dict:
    movimientos = await use_case.execute(
        listar_movimientos_query(1, 500, producto_ids, bodega_ids, tipo, fecha_desde, fecha_hasta),
        tenant,
    )
    return {
        "data": [MovimientoResponse.from_domain(item) for item in movimientos],
        "message": "Reporte de movimientos obtenido",
    }


@movimientos_router.get("/{movimiento_id}", response_model=MovimientoDataResponse)
async def obtener_movimiento(
    movimiento_id: int,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[ObtenerMovimientoUseCase, Depends(get_obtener_movimiento_use_case)],
) -> MovimientoDataResponse:
    movimiento = await use_case.execute(movimiento_id, tenant)
    return MovimientoDataResponse(data=MovimientoResponse.from_domain(movimiento), message="Movimiento obtenido")


@movimientos_router.post("/", response_model=MovimientoDataResponse, status_code=status.HTTP_201_CREATED)
async def registrar_movimiento(
    request: MovimientoCreateRequest,
    tenant: Annotated[ContextoTenant, Depends(get_tenant)],
    use_case: Annotated[RegistrarMovimientoUseCase, Depends(get_registrar_movimiento_use_case)],
) -> MovimientoDataResponse:
    movimiento = await use_case.execute(request.to_command(), tenant)
    return MovimientoDataResponse(data=MovimientoResponse.from_domain(movimiento), message="Movimiento registrado")
