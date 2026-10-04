from datetime import datetime
from decimal import Decimal

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.inventario.application.dto import (
    ListarCatalogoQuery,
    ListarMovimientosQuery,
    ListarProductosQuery,
    ListarReporteProductosQuery,
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
    SeveridadAlerta,
    TipoAjuste,
    TipoMovimiento,
)
from app.modules.inventario.domain.exceptions import StockInsuficiente
from app.modules.inventario.infrastructure.persistence.models import (
    BodegaModel,
    CategoriaProductoModel,
    ExistenciaModel,
    MovimientoInventarioModel,
    MovimientoLineaModel,
    ProductoModel,
)


def _categoria(model: CategoriaProductoModel) -> CategoriaProducto:
    return CategoriaProducto(
        id=model.id,
        empresa_id=model.empresa_id,
        punto_emision_id=model.punto_emision_id,
        nombre=model.nombre,
        descripcion=model.descripcion,
        activo=model.activo,
        creado_en=model.creado_en,
        actualizado_en=model.actualizado_en,
    )


def _bodega(model: BodegaModel) -> Bodega:
    return Bodega(
        id=model.id,
        empresa_id=model.empresa_id,
        punto_emision_id=model.punto_emision_id,
        nombre=model.nombre,
        ubicacion=model.ubicacion,
        activo=model.activo,
        creado_en=model.creado_en,
        actualizado_en=model.actualizado_en,
    )


def _producto(model: ProductoModel, stock_total: Decimal | None = None) -> Producto:
    return Producto(
        id=model.id,
        empresa_id=model.empresa_id,
        punto_emision_id=model.punto_emision_id,
        codigo=model.codigo,
        nombre=model.nombre,
        categoria_id=model.categoria_id,
        precio_venta=Decimal(model.precio_venta),
        tipo_impuesto=model.tipo_impuesto,
        codigo_barras=model.codigo_barras,
        descripcion=model.descripcion,
        categoria_nombre=model.categoria.nombre if model.categoria else None,
        aplica_iva=model.aplica_iva,
        aplica_inventario=model.aplica_inventario,
        stock_minimo=Decimal(model.stock_minimo),
        stock_maximo=Decimal(model.stock_maximo) if model.stock_maximo is not None else None,
        unidad_medida=model.unidad_medida,
        peso=Decimal(model.peso) if model.peso is not None else None,
        activo=model.activo,
        stock_total=stock_total if stock_total is not None else Decimal("0"),
        creado_en=model.creado_en,
        actualizado_en=model.actualizado_en,
    )


def _linea(model: MovimientoLineaModel) -> LineaMovimiento:
    return LineaMovimiento(
        id=model.id,
        producto_id=model.producto_id,
        cantidad=Decimal(model.cantidad),
        stock_origen_despues=Decimal(model.stock_origen_despues),
        producto_codigo=model.producto.codigo if model.producto else None,
        producto_nombre=model.producto.nombre if model.producto else None,
        stock_destino_despues=Decimal(model.stock_destino_despues) if model.stock_destino_despues is not None else None,
    )


def _movimiento(model: MovimientoInventarioModel, con_lineas: bool = True) -> MovimientoInventario:
    return MovimientoInventario(
        id=model.id,
        empresa_id=model.empresa_id,
        punto_emision_id=model.punto_emision_id,
        codigo=model.codigo,
        tipo=model.tipo,
        bodega_id=model.bodega_id,
        bodega_nombre=model.bodega.nombre if model.bodega else None,
        bodega_destino_id=model.bodega_destino_id,
        bodega_destino_nombre=model.bodega_destino.nombre if model.bodega_destino else None,
        tipo_ajuste=model.tipo_ajuste,
        nota=model.nota,
        observacion=model.observacion,
        creado_en=model.creado_en,
        lineas=[_linea(linea) for linea in model.lineas] if con_lineas else [],
    )


class SqlAlchemyCategoriaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _alcance(self, empresa_id: int, punto_emision_id: int):
        return (
            CategoriaProductoModel.empresa_id == empresa_id,
            CategoriaProductoModel.punto_emision_id == punto_emision_id,
        )

    async def obtener_por_id(self, categoria_id: int, empresa_id: int, punto_emision_id: int) -> CategoriaProducto | None:
        result = await self.session.execute(
            select(CategoriaProductoModel).where(
                CategoriaProductoModel.id == categoria_id,
                *self._alcance(empresa_id, punto_emision_id),
            )
        )
        model = result.scalar_one_or_none()
        return _categoria(model) if model else None

    async def obtener_por_nombre(self, nombre: str, empresa_id: int, punto_emision_id: int) -> CategoriaProducto | None:
        result = await self.session.execute(
            select(CategoriaProductoModel).where(
                func.lower(CategoriaProductoModel.nombre) == nombre.strip().lower(),
                *self._alcance(empresa_id, punto_emision_id),
            )
        )
        model = result.scalar_one_or_none()
        return _categoria(model) if model else None

    async def listar(
        self, empresa_id: int, punto_emision_id: int, query: ListarCatalogoQuery
    ) -> tuple[list[CategoriaProducto], int]:
        stmt = select(CategoriaProductoModel).where(*self._alcance(empresa_id, punto_emision_id))
        if query.search:
            termino = f"%{query.search.strip()}%"
            stmt = stmt.where(
                or_(
                    CategoriaProductoModel.nombre.ilike(termino),
                    CategoriaProductoModel.descripcion.ilike(termino),
                )
            )
        if query.activo is not None:
            stmt = stmt.where(CategoriaProductoModel.activo == query.activo)
        total = (await self.session.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
        stmt = stmt.order_by(func.lower(CategoriaProductoModel.nombre), CategoriaProductoModel.id)
        stmt = stmt.offset((query.page - 1) * query.size).limit(query.size)
        models = list((await self.session.execute(stmt)).scalars().all())
        return [_categoria(model) for model in models], total

    async def guardar(self, categoria: CategoriaProducto) -> CategoriaProducto:
        if categoria.id is None:
            model = CategoriaProductoModel(empresa_id=categoria.empresa_id, punto_emision_id=categoria.punto_emision_id)
            self.session.add(model)
        else:
            result = await self.session.execute(select(CategoriaProductoModel).where(CategoriaProductoModel.id == categoria.id))
            model = result.scalar_one()
        model.nombre = categoria.nombre
        model.descripcion = categoria.descripcion
        model.activo = categoria.activo
        await self.session.commit()
        await self.session.refresh(model)
        return _categoria(model)

    async def eliminar(self, categoria_id: int, empresa_id: int, punto_emision_id: int) -> bool:
        result = await self.session.execute(
            delete(CategoriaProductoModel).where(
                CategoriaProductoModel.id == categoria_id,
                *self._alcance(empresa_id, punto_emision_id),
            )
        )
        await self.session.commit()
        return result.rowcount > 0

    async def tiene_productos(self, categoria_id: int) -> bool:
        total = (
            await self.session.execute(select(func.count()).select_from(ProductoModel).where(ProductoModel.categoria_id == categoria_id))
        ).scalar_one()
        return total > 0


class SqlAlchemyBodegaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _alcance(self, empresa_id: int, punto_emision_id: int):
        return (BodegaModel.empresa_id == empresa_id, BodegaModel.punto_emision_id == punto_emision_id)

    async def obtener_por_id(self, bodega_id: int, empresa_id: int, punto_emision_id: int) -> Bodega | None:
        result = await self.session.execute(
            select(BodegaModel).where(BodegaModel.id == bodega_id, *self._alcance(empresa_id, punto_emision_id))
        )
        model = result.scalar_one_or_none()
        return _bodega(model) if model else None

    async def obtener_por_nombre(self, nombre: str, empresa_id: int, punto_emision_id: int) -> Bodega | None:
        result = await self.session.execute(
            select(BodegaModel).where(
                func.lower(BodegaModel.nombre) == nombre.strip().lower(),
                *self._alcance(empresa_id, punto_emision_id),
            )
        )
        model = result.scalar_one_or_none()
        return _bodega(model) if model else None

    async def listar(self, empresa_id: int, punto_emision_id: int, query: ListarCatalogoQuery) -> tuple[list[Bodega], int]:
        stmt = select(BodegaModel).where(*self._alcance(empresa_id, punto_emision_id))
        if query.search:
            termino = f"%{query.search.strip()}%"
            stmt = stmt.where(or_(BodegaModel.nombre.ilike(termino), BodegaModel.ubicacion.ilike(termino)))
        if query.activo is not None:
            stmt = stmt.where(BodegaModel.activo == query.activo)
        total = (await self.session.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
        stmt = stmt.order_by(func.lower(BodegaModel.nombre), BodegaModel.id)
        stmt = stmt.offset((query.page - 1) * query.size).limit(query.size)
        models = list((await self.session.execute(stmt)).scalars().all())
        return [_bodega(model) for model in models], total

    async def guardar(self, bodega: Bodega) -> Bodega:
        if bodega.id is None:
            model = BodegaModel(empresa_id=bodega.empresa_id, punto_emision_id=bodega.punto_emision_id)
            self.session.add(model)
        else:
            result = await self.session.execute(select(BodegaModel).where(BodegaModel.id == bodega.id))
            model = result.scalar_one()
        model.nombre = bodega.nombre
        model.ubicacion = bodega.ubicacion
        model.activo = bodega.activo
        await self.session.commit()
        await self.session.refresh(model)
        return _bodega(model)

    async def eliminar(self, bodega_id: int, empresa_id: int, punto_emision_id: int) -> bool:
        result = await self.session.execute(
            delete(BodegaModel).where(BodegaModel.id == bodega_id, *self._alcance(empresa_id, punto_emision_id))
        )
        await self.session.commit()
        return result.rowcount > 0

    async def esta_en_uso(self, bodega_id: int) -> bool:
        existencias = (
            await self.session.execute(select(func.count()).select_from(ExistenciaModel).where(ExistenciaModel.bodega_id == bodega_id))
        ).scalar_one()
        movimientos = (
            await self.session.execute(
                select(func.count()).select_from(MovimientoInventarioModel).where(
                    or_(
                        MovimientoInventarioModel.bodega_id == bodega_id,
                        MovimientoInventarioModel.bodega_destino_id == bodega_id,
                    )
                )
            )
        ).scalar_one()
        return existencias > 0 or movimientos > 0


class SqlAlchemyProductoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _alcance(self, empresa_id: int, punto_emision_id: int):
        return (ProductoModel.empresa_id == empresa_id, ProductoModel.punto_emision_id == punto_emision_id)

    def _base(self):
        return select(ProductoModel).options(selectinload(ProductoModel.categoria))

    async def _stock_map(self, producto_ids: list[int]) -> dict[int, Decimal]:
        if not producto_ids:
            return {}
        result = await self.session.execute(
            select(ExistenciaModel.producto_id, func.coalesce(func.sum(ExistenciaModel.cantidad), 0)).where(
                ExistenciaModel.producto_id.in_(producto_ids)
            ).group_by(ExistenciaModel.producto_id)
        )
        return {row[0]: Decimal(row[1]) for row in result.all()}

    async def obtener_por_id(self, producto_id: int, empresa_id: int, punto_emision_id: int) -> Producto | None:
        result = await self.session.execute(
            self._base().where(ProductoModel.id == producto_id, *self._alcance(empresa_id, punto_emision_id))
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None
        stocks = await self._stock_map([model.id])
        return _producto(model, stocks.get(model.id, Decimal("0")))

    async def obtener_por_codigo(self, codigo: str, empresa_id: int, punto_emision_id: int) -> Producto | None:
        result = await self.session.execute(
            self._base().where(func.upper(ProductoModel.codigo) == codigo.upper(), *self._alcance(empresa_id, punto_emision_id))
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None
        stocks = await self._stock_map([model.id])
        return _producto(model, stocks.get(model.id, Decimal("0")))

    async def obtener_por_codigo_barras(
        self, codigo_barras: str, empresa_id: int, punto_emision_id: int
    ) -> Producto | None:
        result = await self.session.execute(
            self._base().where(
                func.upper(ProductoModel.codigo_barras) == codigo_barras.upper(),
                *self._alcance(empresa_id, punto_emision_id),
            )
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None
        stocks = await self._stock_map([model.id])
        return _producto(model, stocks.get(model.id, Decimal("0")))

    async def listar(
        self, empresa_id: int, punto_emision_id: int, query: ListarProductosQuery
    ) -> tuple[list[Producto], int]:
        stmt = self._base().where(*self._alcance(empresa_id, punto_emision_id))
        if query.search:
            termino = f"%{query.search.strip()}%"
            stmt = stmt.where(
                or_(
                    ProductoModel.codigo.ilike(termino),
                    ProductoModel.codigo_barras.ilike(termino),
                    ProductoModel.nombre.ilike(termino),
                    ProductoModel.descripcion.ilike(termino),
                )
            )
        if query.categoria_id:
            stmt = stmt.where(ProductoModel.categoria_id == query.categoria_id)
        if query.activo is not None:
            stmt = stmt.where(ProductoModel.activo == query.activo)
        if query.aplica_inventario is not None:
            stmt = stmt.where(ProductoModel.aplica_inventario == query.aplica_inventario)
        total = (await self.session.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
        stmt = stmt.order_by(func.lower(ProductoModel.nombre), ProductoModel.id)
        stmt = stmt.offset((query.page - 1) * query.size).limit(query.size)
        models = list((await self.session.execute(stmt)).scalars().all())
        stocks = await self._stock_map([model.id for model in models])
        return [_producto(model, stocks.get(model.id, Decimal("0"))) for model in models], total

    async def guardar(self, producto: Producto) -> Producto:
        if producto.id is None:
            model = ProductoModel(empresa_id=producto.empresa_id, punto_emision_id=producto.punto_emision_id)
            self.session.add(model)
        else:
            result = await self.session.execute(select(ProductoModel).where(ProductoModel.id == producto.id))
            model = result.scalar_one()
        model.codigo = producto.codigo
        model.codigo_barras = producto.codigo_barras
        model.nombre = producto.nombre
        model.descripcion = producto.descripcion
        model.categoria_id = producto.categoria_id
        model.precio_venta = producto.precio_venta
        model.aplica_iva = producto.aplica_iva
        model.aplica_inventario = producto.aplica_inventario
        model.tipo_impuesto = producto.tipo_impuesto
        model.stock_minimo = producto.stock_minimo
        model.stock_maximo = producto.stock_maximo
        model.unidad_medida = producto.unidad_medida
        model.peso = producto.peso
        model.activo = producto.activo
        await self.session.commit()
        await self.session.refresh(model, attribute_names=["id", "creado_en", "actualizado_en"])
        return await self.obtener_por_id(model.id, producto.empresa_id, producto.punto_emision_id)  # type: ignore[return-value]

    async def eliminar(self, producto_id: int, empresa_id: int, punto_emision_id: int) -> bool:
        await self.session.execute(delete(ExistenciaModel).where(ExistenciaModel.producto_id == producto_id))
        result = await self.session.execute(
            delete(ProductoModel).where(ProductoModel.id == producto_id, *self._alcance(empresa_id, punto_emision_id))
        )
        await self.session.commit()
        return result.rowcount > 0

    async def tiene_movimientos(self, producto_id: int) -> bool:
        total = (
            await self.session.execute(
                select(func.count()).select_from(MovimientoLineaModel).where(MovimientoLineaModel.producto_id == producto_id)
            )
        ).scalar_one()
        return total > 0

    async def existencias(self, producto_id: int) -> list[Existencia]:
        result = await self.session.execute(
            select(ExistenciaModel).options(selectinload(ExistenciaModel.bodega)).where(ExistenciaModel.producto_id == producto_id)
        )
        return [
            Existencia(
                producto_id=model.producto_id,
                bodega_id=model.bodega_id,
                cantidad=Decimal(model.cantidad),
                bodega_nombre=model.bodega.nombre if model.bodega else None,
                actualizado_en=model.actualizado_en,
            )
            for model in result.scalars().all()
        ]

    async def kardex(self, producto_id: int, empresa_id: int, punto_emision_id: int) -> list[ItemKardex]:
        stmt = (
            select(MovimientoLineaModel)
            .join(MovimientoInventarioModel)
            .options(
                selectinload(MovimientoLineaModel.producto),
            )
            .where(
                MovimientoLineaModel.producto_id == producto_id,
                MovimientoInventarioModel.empresa_id == empresa_id,
                MovimientoInventarioModel.punto_emision_id == punto_emision_id,
            )
            .order_by(MovimientoInventarioModel.creado_en.desc(), MovimientoLineaModel.id.desc())
        )
        lineas = list((await self.session.execute(stmt)).scalars().all())
        if not lineas:
            return []
        movimiento_ids = [linea.movimiento_id for linea in lineas]
        movimientos = (
            await self.session.execute(
                select(MovimientoInventarioModel)
                .options(
                    selectinload(MovimientoInventarioModel.bodega),
                    selectinload(MovimientoInventarioModel.bodega_destino),
                )
                .where(MovimientoInventarioModel.id.in_(movimiento_ids))
            )
        ).scalars()
        por_id = {model.id: model for model in movimientos}
        items: list[ItemKardex] = []
        for linea in lineas:
            movimiento = por_id[linea.movimiento_id]
            items.append(
                ItemKardex(
                    movimiento_id=movimiento.id,
                    codigo=movimiento.codigo,
                    tipo=movimiento.tipo,
                    bodega_id=movimiento.bodega_id,
                    bodega_nombre=movimiento.bodega.nombre if movimiento.bodega else "",
                    bodega_destino_id=movimiento.bodega_destino_id,
                    bodega_destino_nombre=movimiento.bodega_destino.nombre if movimiento.bodega_destino else None,
                    tipo_ajuste=movimiento.tipo_ajuste,
                    cantidad=Decimal(linea.cantidad),
                    stock_origen_despues=Decimal(linea.stock_origen_despues),
                    stock_destino_despues=Decimal(linea.stock_destino_despues) if linea.stock_destino_despues is not None else None,
                    nota=movimiento.nota,
                    creado_en=movimiento.creado_en,
                )
            )
        return items

    async def alertas(self, empresa_id: int, punto_emision_id: int) -> list[AlertaStock]:
        productos, _ = await self.listar(
            empresa_id,
            punto_emision_id,
            ListarProductosQuery(page=1, size=500, activo=True),
        )
        alertas: list[AlertaStock] = []
        for producto in productos:
            if not producto.aplica_inventario:
                continue
            if producto.stock_minimo <= 0:
                continue
            if producto.stock_total > producto.stock_minimo:
                continue
            critico = producto.stock_total <= 0 or producto.stock_total <= producto.stock_minimo * Decimal("0.5")
            alertas.append(
                AlertaStock(
                    producto_id=producto.id or 0,
                    codigo=producto.codigo,
                    nombre=producto.nombre,
                    stock_minimo=producto.stock_minimo,
                    stock_total=producto.stock_total,
                    severidad=SeveridadAlerta.CRITICAL if critico else SeveridadAlerta.WARNING,
                )
            )
        alertas.sort(key=lambda item: (item.severidad != SeveridadAlerta.CRITICAL, item.stock_total, item.nombre))
        return alertas

    async def reporte(
        self, empresa_id: int, punto_emision_id: int, query: ListarReporteProductosQuery
    ) -> tuple[list[Producto], int]:
        stmt = self._base().where(*self._alcance(empresa_id, punto_emision_id))
        if query.producto_ids:
            stmt = stmt.where(ProductoModel.id.in_(query.producto_ids))
        if query.bodega_ids:
            en_existencia = select(ExistenciaModel.producto_id).where(ExistenciaModel.bodega_id.in_(query.bodega_ids))
            en_movimientos = (
                select(MovimientoLineaModel.producto_id)
                .join(MovimientoInventarioModel, MovimientoLineaModel.movimiento_id == MovimientoInventarioModel.id)
                .where(
                    or_(
                        MovimientoInventarioModel.bodega_id.in_(query.bodega_ids),
                        MovimientoInventarioModel.bodega_destino_id.in_(query.bodega_ids),
                    )
                )
            )
            stmt = stmt.where(or_(ProductoModel.id.in_(en_existencia), ProductoModel.id.in_(en_movimientos)))
        total = (await self.session.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
        stmt = stmt.order_by(func.lower(ProductoModel.nombre), ProductoModel.id)
        stmt = stmt.offset((query.page - 1) * query.size).limit(query.size)
        models = list((await self.session.execute(stmt)).scalars().all())
        stocks = await self._stock_map([model.id for model in models])
        return [_producto(model, stocks.get(model.id, Decimal("0"))) for model in models], total


class SqlAlchemyMovimientoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _alcance(self, empresa_id: int, punto_emision_id: int):
        return (
            MovimientoInventarioModel.empresa_id == empresa_id,
            MovimientoInventarioModel.punto_emision_id == punto_emision_id,
        )

    def _options(self):
        return (
            selectinload(MovimientoInventarioModel.bodega),
            selectinload(MovimientoInventarioModel.bodega_destino),
            selectinload(MovimientoInventarioModel.lineas).selectinload(MovimientoLineaModel.producto),
        )

    async def obtener_por_id(
        self, movimiento_id: int, empresa_id: int, punto_emision_id: int
    ) -> MovimientoInventario | None:
        result = await self.session.execute(
            select(MovimientoInventarioModel)
            .options(*self._options())
            .where(MovimientoInventarioModel.id == movimiento_id, *self._alcance(empresa_id, punto_emision_id))
        )
        model = result.scalar_one_or_none()
        return _movimiento(model) if model else None

    async def obtener_por_codigo(
        self, codigo: str, empresa_id: int, punto_emision_id: int
    ) -> MovimientoInventario | None:
        result = await self.session.execute(
            select(MovimientoInventarioModel).where(
                func.upper(MovimientoInventarioModel.codigo) == codigo.upper(),
                *self._alcance(empresa_id, punto_emision_id),
            )
        )
        model = result.scalar_one_or_none()
        return _movimiento(model, con_lineas=False) if model else None

    def _filtrar(self, stmt, query: ListarMovimientosQuery):
        if query.tipo:
            stmt = stmt.where(MovimientoInventarioModel.tipo == query.tipo)
        if query.fecha_desde:
            stmt = stmt.where(MovimientoInventarioModel.creado_en >= query.fecha_desde)
        if query.fecha_hasta:
            stmt = stmt.where(MovimientoInventarioModel.creado_en <= query.fecha_hasta)
        if query.bodega_ids:
            stmt = stmt.where(
                or_(
                    MovimientoInventarioModel.bodega_id.in_(query.bodega_ids),
                    MovimientoInventarioModel.bodega_destino_id.in_(query.bodega_ids),
                )
            )
        if query.producto_ids:
            stmt = stmt.where(
                MovimientoInventarioModel.id.in_(
                    select(MovimientoLineaModel.movimiento_id).where(MovimientoLineaModel.producto_id.in_(query.producto_ids))
                )
            )
        return stmt

    async def listar(
        self, empresa_id: int, punto_emision_id: int, query: ListarMovimientosQuery
    ) -> tuple[list[MovimientoInventario], int]:
        filtrado = self._filtrar(
            select(MovimientoInventarioModel).where(*self._alcance(empresa_id, punto_emision_id)),
            query,
        )
        total = (await self.session.execute(select(func.count()).select_from(filtrado.subquery()))).scalar_one()
        stmt = (
            filtrado.options(*self._options())
            .order_by(MovimientoInventarioModel.creado_en.desc(), MovimientoInventarioModel.id.desc())
            .offset((query.page - 1) * query.size)
            .limit(query.size)
        )
        models = list((await self.session.execute(stmt)).scalars().unique().all())
        return [_movimiento(model) for model in models], total

    async def reporte(
        self, empresa_id: int, punto_emision_id: int, query: ListarMovimientosQuery
    ) -> list[MovimientoInventario]:
        copia = ListarMovimientosQuery(
            page=1,
            size=500,
            producto_ids=query.producto_ids,
            bodega_ids=query.bodega_ids,
            tipo=query.tipo,
            fecha_desde=query.fecha_desde,
            fecha_hasta=query.fecha_hasta,
        )
        movimientos, _ = await self.listar(empresa_id, punto_emision_id, copia)
        return movimientos

    async def _existencia(self, producto_id: int, bodega_id: int, crear: bool) -> ExistenciaModel:
        result = await self.session.execute(
            select(ExistenciaModel)
            .where(ExistenciaModel.producto_id == producto_id, ExistenciaModel.bodega_id == bodega_id)
            .with_for_update()
        )
        model = result.scalar_one_or_none()
        if model is None:
            if not crear:
                model = ExistenciaModel(producto_id=producto_id, bodega_id=bodega_id, cantidad=Decimal("0"))
                self.session.add(model)
                await self.session.flush()
            else:
                model = ExistenciaModel(producto_id=producto_id, bodega_id=bodega_id, cantidad=Decimal("0"))
                self.session.add(model)
                await self.session.flush()
        return model

    def _suma(self, tipo: TipoMovimiento, tipo_ajuste: TipoAjuste | None) -> bool:
        if tipo in (TipoMovimiento.INGRESO, TipoMovimiento.STOCK_INICIAL):
            return True
        if tipo == TipoMovimiento.AJUSTE:
            return tipo_ajuste == TipoAjuste.INGRESO
        return False

    async def listar_por_nota_prefijo(
        self, prefijo: str, empresa_id: int, punto_emision_id: int
    ) -> list[MovimientoInventario]:
        result = await self.session.execute(
            select(MovimientoInventarioModel)
            .options(*self._options())
            .where(
                MovimientoInventarioModel.nota.ilike(f"{prefijo}%"),
                *self._alcance(empresa_id, punto_emision_id),
            )
        )
        return [_movimiento(model) for model in result.scalars().unique().all()]

    async def existe_por_nota(self, prefijo: str, empresa_id: int, punto_emision_id: int) -> bool:
        result = await self.session.scalar(
            select(MovimientoInventarioModel.id).where(
                MovimientoInventarioModel.nota.ilike(f"{prefijo}%"),
                *self._alcance(empresa_id, punto_emision_id),
            )
        )
        return result is not None

    async def registrar(self, movimiento: MovimientoInventario) -> MovimientoInventario:
        lineas_persistidas: list[MovimientoLineaModel] = []
        for linea in movimiento.lineas:
            suma = self._suma(movimiento.tipo, movimiento.tipo_ajuste)
            origen = await self._existencia(linea.producto_id, movimiento.bodega_id, crear=suma)
            actual = Decimal(origen.cantidad)
            cantidad = Decimal(linea.cantidad)
            if movimiento.tipo == TipoMovimiento.TRANSFERENCIA:
                if actual - cantidad < 0:
                    raise StockInsuficiente(
                        f"Stock insuficiente de {linea.producto_nombre or linea.producto_id} en la bodega origen"
                    )
                origen.cantidad = actual - cantidad
                destino = await self._existencia(linea.producto_id, movimiento.bodega_destino_id or 0, crear=True)
                destino.cantidad = Decimal(destino.cantidad) + cantidad
                lineas_persistidas.append(
                    MovimientoLineaModel(
                        producto_id=linea.producto_id,
                        cantidad=cantidad,
                        stock_origen_despues=origen.cantidad,
                        stock_destino_despues=destino.cantidad,
                    )
                )
            elif suma:
                origen.cantidad = actual + cantidad
                lineas_persistidas.append(
                    MovimientoLineaModel(
                        producto_id=linea.producto_id,
                        cantidad=cantidad,
                        stock_origen_despues=origen.cantidad,
                    )
                )
            else:
                if actual - cantidad < 0:
                    raise StockInsuficiente(
                        f"Stock insuficiente de {linea.producto_nombre or linea.producto_id} en la bodega"
                    )
                origen.cantidad = actual - cantidad
                lineas_persistidas.append(
                    MovimientoLineaModel(
                        producto_id=linea.producto_id,
                        cantidad=cantidad,
                        stock_origen_despues=origen.cantidad,
                    )
                )

        model = MovimientoInventarioModel(
            empresa_id=movimiento.empresa_id,
            punto_emision_id=movimiento.punto_emision_id,
            codigo=movimiento.codigo,
            tipo=movimiento.tipo,
            bodega_id=movimiento.bodega_id,
            bodega_destino_id=movimiento.bodega_destino_id,
            tipo_ajuste=movimiento.tipo_ajuste,
            nota=movimiento.nota,
            observacion=movimiento.observacion,
            lineas=lineas_persistidas,
        )
        self.session.add(model)
        await self.session.commit()
        return await self.obtener_por_id(model.id, movimiento.empresa_id, movimiento.punto_emision_id)  # type: ignore[return-value]
