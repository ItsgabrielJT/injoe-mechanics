from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.modules.inventario.application.dto import (
    ActualizarBodegaCommand,
    ActualizarCategoriaCommand,
    ActualizarProductoCommand,
    CrearBodegaCommand,
    CrearCategoriaCommand,
    CrearProductoCommand,
    ItemMovimientoCommand,
    ListarCatalogoQuery,
    ListarMovimientosQuery,
    ListarProductosQuery,
    ListarReporteProductosQuery,
    RegistrarMovimientoCommand,
    StockInicialCommand,
)
from app.modules.inventario.domain.entities import (
    AlertaStock,
    Bodega,
    CategoriaProducto,
    Existencia,
    ItemKardex,
    LineaMovimiento,
    MovimientoInventario,
    Producto,
    TipoAjuste,
    TipoImpuesto,
    TipoMovimiento,
)


def _vacio_a_nulo(valor: object) -> object:
    if isinstance(valor, str) and not valor.strip():
        return None
    return valor


class CategoriaCreateRequest(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=120)
    descripcion: str | None = Field(None, max_length=500)
    activo: bool = True

    @field_validator("descripcion", mode="before")
    @classmethod
    def limpiar(cls, valor: object) -> object:
        return _vacio_a_nulo(valor)

    def to_command(self) -> CrearCategoriaCommand:
        return CrearCategoriaCommand(**self.model_dump())


class CategoriaUpdateRequest(BaseModel):
    nombre: str | None = Field(None, min_length=2, max_length=120)
    descripcion: str | None = Field(None, max_length=500)
    activo: bool | None = None

    def to_command(self, categoria_id: int) -> ActualizarCategoriaCommand:
        return ActualizarCategoriaCommand(categoria_id=categoria_id, **self.model_dump())


class CategoriaResponse(BaseModel):
    id: int
    empresa_id: int
    punto_emision_id: int
    nombre: str
    descripcion: str | None = None
    activo: bool
    creado_en: datetime | None = None
    actualizado_en: datetime | None = None

    @classmethod
    def from_domain(cls, categoria: CategoriaProducto) -> "CategoriaResponse":
        return cls(
            id=categoria.id or 0,
            empresa_id=categoria.empresa_id,
            punto_emision_id=categoria.punto_emision_id,
            nombre=categoria.nombre,
            descripcion=categoria.descripcion,
            activo=categoria.activo,
            creado_en=categoria.creado_en,
            actualizado_en=categoria.actualizado_en,
        )


class BodegaCreateRequest(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=120)
    ubicacion: str | None = Field(None, max_length=255)
    activo: bool = True

    @field_validator("ubicacion", mode="before")
    @classmethod
    def limpiar(cls, valor: object) -> object:
        return _vacio_a_nulo(valor)

    def to_command(self) -> CrearBodegaCommand:
        return CrearBodegaCommand(**self.model_dump())


class BodegaUpdateRequest(BaseModel):
    nombre: str | None = Field(None, min_length=2, max_length=120)
    ubicacion: str | None = Field(None, max_length=255)
    activo: bool | None = None

    def to_command(self, bodega_id: int) -> ActualizarBodegaCommand:
        return ActualizarBodegaCommand(bodega_id=bodega_id, **self.model_dump())


class BodegaResponse(BaseModel):
    id: int
    empresa_id: int
    punto_emision_id: int
    nombre: str
    ubicacion: str | None = None
    activo: bool
    creado_en: datetime | None = None
    actualizado_en: datetime | None = None

    @classmethod
    def from_domain(cls, bodega: Bodega) -> "BodegaResponse":
        return cls(
            id=bodega.id or 0,
            empresa_id=bodega.empresa_id,
            punto_emision_id=bodega.punto_emision_id,
            nombre=bodega.nombre,
            ubicacion=bodega.ubicacion,
            activo=bodega.activo,
            creado_en=bodega.creado_en,
            actualizado_en=bodega.actualizado_en,
        )


class StockInicialRequest(BaseModel):
    bodega_id: int
    cantidad: Decimal = Field(..., gt=0)


class ProductoCreateRequest(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=20)
    nombre: str = Field(..., min_length=2, max_length=255)
    categoria_id: int
    precio_venta: Decimal = Field(..., gt=0, le=Decimal("99999999.99"))
    tipo_impuesto: TipoImpuesto
    codigo_barras: str | None = Field(None, max_length=64)
    descripcion: str | None = Field(None, max_length=500)
    aplica_iva: bool = True
    aplica_inventario: bool = True
    stock_minimo: Decimal = Field(Decimal("0"), ge=0)
    stock_maximo: Decimal | None = Field(None, ge=0)
    unidad_medida: str = Field("UN", max_length=20)
    peso: Decimal | None = Field(None, ge=0)
    activo: bool = True
    stock_inicial: StockInicialRequest | None = None

    @field_validator("codigo_barras", "descripcion", mode="before")
    @classmethod
    def limpiar(cls, valor: object) -> object:
        return _vacio_a_nulo(valor)

    def to_command(self) -> CrearProductoCommand:
        data = self.model_dump()
        inicial = data.pop("stock_inicial")
        return CrearProductoCommand(
            **data,
            stock_inicial=StockInicialCommand(**inicial) if inicial else None,
        )


class ProductoUpdateRequest(BaseModel):
    codigo: str | None = Field(None, min_length=1, max_length=20)
    nombre: str | None = Field(None, min_length=2, max_length=255)
    categoria_id: int | None = None
    precio_venta: Decimal | None = Field(None, gt=0, le=Decimal("99999999.99"))
    tipo_impuesto: TipoImpuesto | None = None
    codigo_barras: str | None = Field(None, max_length=64)
    descripcion: str | None = Field(None, max_length=500)
    aplica_iva: bool | None = None
    aplica_inventario: bool | None = None
    stock_minimo: Decimal | None = Field(None, ge=0)
    stock_maximo: Decimal | None = Field(None, ge=0)
    unidad_medida: str | None = Field(None, max_length=20)
    peso: Decimal | None = Field(None, ge=0)
    activo: bool | None = None

    def to_command(self, producto_id: int) -> ActualizarProductoCommand:
        return ActualizarProductoCommand(producto_id=producto_id, **self.model_dump())


class ProductoResponse(BaseModel):
    id: int
    empresa_id: int
    punto_emision_id: int
    codigo: str
    codigo_barras: str | None = None
    nombre: str
    descripcion: str | None = None
    categoria_id: int
    categoria_nombre: str | None = None
    precio_venta: Decimal
    aplica_iva: bool
    aplica_inventario: bool
    tipo_impuesto: TipoImpuesto
    stock_minimo: Decimal
    stock_maximo: Decimal | None = None
    unidad_medida: str
    peso: Decimal | None = None
    activo: bool
    stock_total: Decimal
    creado_en: datetime | None = None
    actualizado_en: datetime | None = None

    @classmethod
    def from_domain(cls, producto: Producto) -> "ProductoResponse":
        return cls(
            id=producto.id or 0,
            empresa_id=producto.empresa_id,
            punto_emision_id=producto.punto_emision_id,
            codigo=producto.codigo,
            codigo_barras=producto.codigo_barras,
            nombre=producto.nombre,
            descripcion=producto.descripcion,
            categoria_id=producto.categoria_id,
            categoria_nombre=producto.categoria_nombre,
            precio_venta=producto.precio_venta,
            aplica_iva=producto.aplica_iva,
            aplica_inventario=producto.aplica_inventario,
            tipo_impuesto=producto.tipo_impuesto,
            stock_minimo=producto.stock_minimo,
            stock_maximo=producto.stock_maximo,
            unidad_medida=producto.unidad_medida,
            peso=producto.peso,
            activo=producto.activo,
            stock_total=producto.stock_total,
            creado_en=producto.creado_en,
            actualizado_en=producto.actualizado_en,
        )


class ExistenciaResponse(BaseModel):
    producto_id: int
    bodega_id: int
    bodega_nombre: str | None = None
    cantidad: Decimal
    actualizado_en: datetime | None = None

    @classmethod
    def from_domain(cls, existencia: Existencia) -> "ExistenciaResponse":
        return cls(
            producto_id=existencia.producto_id,
            bodega_id=existencia.bodega_id,
            bodega_nombre=existencia.bodega_nombre,
            cantidad=existencia.cantidad,
            actualizado_en=existencia.actualizado_en,
        )


class AlertaResponse(BaseModel):
    producto_id: int
    codigo: str
    nombre: str
    stock_minimo: Decimal
    stock_total: Decimal
    severidad: str

    @classmethod
    def from_domain(cls, alerta: AlertaStock) -> "AlertaResponse":
        return cls(
            producto_id=alerta.producto_id,
            codigo=alerta.codigo,
            nombre=alerta.nombre,
            stock_minimo=alerta.stock_minimo,
            stock_total=alerta.stock_total,
            severidad=alerta.severidad.value,
        )


class KardexItemResponse(BaseModel):
    movimiento_id: int
    codigo: str
    tipo: TipoMovimiento
    bodega_id: int
    bodega_nombre: str
    bodega_destino_id: int | None = None
    bodega_destino_nombre: str | None = None
    tipo_ajuste: TipoAjuste | None = None
    cantidad: Decimal
    stock_origen_despues: Decimal
    stock_destino_despues: Decimal | None = None
    nota: str | None = None
    creado_en: datetime

    @classmethod
    def from_domain(cls, item: ItemKardex) -> "KardexItemResponse":
        return cls(
            movimiento_id=item.movimiento_id,
            codigo=item.codigo,
            tipo=item.tipo,
            bodega_id=item.bodega_id,
            bodega_nombre=item.bodega_nombre,
            bodega_destino_id=item.bodega_destino_id,
            bodega_destino_nombre=item.bodega_destino_nombre,
            tipo_ajuste=item.tipo_ajuste,
            cantidad=item.cantidad,
            stock_origen_despues=item.stock_origen_despues,
            stock_destino_despues=item.stock_destino_despues,
            nota=item.nota,
            creado_en=item.creado_en,
        )


class ItemMovimientoRequest(BaseModel):
    producto_id: int
    cantidad: Decimal = Field(..., gt=0)


class MovimientoCreateRequest(BaseModel):
    tipo: TipoMovimiento
    bodega_id: int
    items: list[ItemMovimientoRequest]
    bodega_destino_id: int | None = None
    tipo_ajuste: TipoAjuste | None = None
    nota: str | None = Field(None, max_length=255)
    observacion: str | None = Field(None, max_length=500)

    def to_command(self) -> RegistrarMovimientoCommand:
        return RegistrarMovimientoCommand(
            tipo=self.tipo,
            bodega_id=self.bodega_id,
            bodega_destino_id=self.bodega_destino_id,
            tipo_ajuste=self.tipo_ajuste,
            nota=self.nota,
            observacion=self.observacion,
            items=[ItemMovimientoCommand(producto_id=item.producto_id, cantidad=item.cantidad) for item in self.items],
        )


class LineaMovimientoResponse(BaseModel):
    id: int | None = None
    producto_id: int
    producto_codigo: str | None = None
    producto_nombre: str | None = None
    cantidad: Decimal
    stock_origen_despues: Decimal
    stock_destino_despues: Decimal | None = None

    @classmethod
    def from_domain(cls, linea: LineaMovimiento) -> "LineaMovimientoResponse":
        return cls(
            id=linea.id,
            producto_id=linea.producto_id,
            producto_codigo=linea.producto_codigo,
            producto_nombre=linea.producto_nombre,
            cantidad=linea.cantidad,
            stock_origen_despues=linea.stock_origen_despues,
            stock_destino_despues=linea.stock_destino_despues,
        )


class MovimientoResponse(BaseModel):
    id: int
    empresa_id: int
    punto_emision_id: int
    codigo: str
    tipo: TipoMovimiento
    bodega_id: int
    bodega_nombre: str | None = None
    bodega_destino_id: int | None = None
    bodega_destino_nombre: str | None = None
    tipo_ajuste: TipoAjuste | None = None
    nota: str | None = None
    observacion: str | None = None
    creado_en: datetime | None = None
    lineas: list[LineaMovimientoResponse] = []

    @classmethod
    def from_domain(cls, movimiento: MovimientoInventario) -> "MovimientoResponse":
        return cls(
            id=movimiento.id or 0,
            empresa_id=movimiento.empresa_id,
            punto_emision_id=movimiento.punto_emision_id,
            codigo=movimiento.codigo,
            tipo=movimiento.tipo,
            bodega_id=movimiento.bodega_id,
            bodega_nombre=movimiento.bodega_nombre,
            bodega_destino_id=movimiento.bodega_destino_id,
            bodega_destino_nombre=movimiento.bodega_destino_nombre,
            tipo_ajuste=movimiento.tipo_ajuste,
            nota=movimiento.nota,
            observacion=movimiento.observacion,
            creado_en=movimiento.creado_en,
            lineas=[LineaMovimientoResponse.from_domain(linea) for linea in movimiento.lineas],
        )


class ProductoReporteResponse(BaseModel):
    producto: ProductoResponse
    kardex: list[KardexItemResponse]
    existencias: list[ExistenciaResponse]
    stock_corte: Decimal


def listar_reporte_productos_query(
    page: int,
    size: int,
    producto_ids: list[int] | None,
    bodega_ids: list[int] | None,
    fecha_desde: datetime | None,
    fecha_hasta: datetime | None,
) -> ListarReporteProductosQuery:
    return ListarReporteProductosQuery(
        page=page,
        size=size,
        producto_ids=producto_ids,
        bodega_ids=bodega_ids,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
    )


class ListaResponse(BaseModel):
    total: int
    page: int
    size: int
    pages: int
    message: str = "Lista obtenida"


class CategoriaListResponse(ListaResponse):
    data: list[CategoriaResponse]


class BodegaListResponse(ListaResponse):
    data: list[BodegaResponse]


class ProductoListResponse(ListaResponse):
    data: list[ProductoResponse]


class MovimientoListResponse(ListaResponse):
    data: list[MovimientoResponse]


class CategoriaDataResponse(BaseModel):
    data: CategoriaResponse
    message: str


class BodegaDataResponse(BaseModel):
    data: BodegaResponse
    message: str


class ProductoDataResponse(BaseModel):
    data: ProductoResponse
    message: str


class MovimientoDataResponse(BaseModel):
    data: MovimientoResponse
    message: str


def paginas(total: int, size: int) -> int:
    return (total + size - 1) // size if size else 1


def listar_catalogo_query(page: int, size: int, search: str | None, activo: bool | None) -> ListarCatalogoQuery:
    return ListarCatalogoQuery(page=page, size=size, search=search, activo=activo)


def listar_productos_query(
    page: int,
    size: int,
    search: str | None,
    categoria_id: int | None,
    activo: bool | None,
    aplica_inventario: bool | None = None,
) -> ListarProductosQuery:
    return ListarProductosQuery(
        page=page,
        size=size,
        search=search,
        categoria_id=categoria_id,
        activo=activo,
        aplica_inventario=aplica_inventario,
    )


def listar_movimientos_query(
    page: int,
    size: int,
    producto_ids: list[int] | None,
    bodega_ids: list[int] | None,
    tipo: TipoMovimiento | None,
    fecha_desde: datetime | None,
    fecha_hasta: datetime | None,
) -> ListarMovimientosQuery:
    return ListarMovimientosQuery(
        page=page,
        size=size,
        producto_ids=producto_ids,
        bodega_ids=bodega_ids,
        tipo=tipo,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
    )
