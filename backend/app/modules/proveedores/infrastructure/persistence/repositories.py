from decimal import Decimal

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.proveedores.application.dto import ListarProveedoresQuery
from app.modules.proveedores.domain.entities import PrecioProveedor, Proveedor
from app.modules.proveedores.infrastructure.persistence.models import (
    ProductoProveedorModel,
    ProveedorModel,
    ServicioProveedorModel,
)


def _proveedor(model: ProveedorModel) -> Proveedor:
    return Proveedor(
        id=model.id,
        empresa_id=model.empresa_id,
        punto_emision_id=model.punto_emision_id,
        identificacion=model.identificacion,
        nombres=model.nombres,
        tipo_persona=model.tipo_persona,
        razon_social=model.razon_social,
        direccion=model.direccion,
        telefono=model.telefono,
        correo=model.correo,
        direccion_fiscal=model.direccion_fiscal,
        telefono_fiscal=model.telefono_fiscal,
        correo_fiscal=model.correo_fiscal,
        notas=model.notas,
        activo=model.activo,
        creado_en=model.creado_en,
        actualizado_en=model.actualizado_en,
    )


def _precio_producto(model: ProductoProveedorModel) -> PrecioProveedor:
    return PrecioProveedor(
        id=model.id,
        proveedor_id=model.proveedor_id,
        precio_compra=Decimal(model.precio_compra),
        es_principal=model.es_principal,
        proveedor_nombres=model.proveedor.nombres if model.proveedor else None,
        proveedor_identificacion=model.proveedor.identificacion if model.proveedor else None,
        producto_id=model.producto_id,
        creado_en=model.creado_en,
        actualizado_en=model.actualizado_en,
    )


def _precio_servicio(model: ServicioProveedorModel) -> PrecioProveedor:
    return PrecioProveedor(
        id=model.id,
        proveedor_id=model.proveedor_id,
        precio_compra=Decimal(model.precio_compra),
        es_principal=model.es_principal,
        proveedor_nombres=model.proveedor.nombres if model.proveedor else None,
        proveedor_identificacion=model.proveedor.identificacion if model.proveedor else None,
        servicio_id=model.servicio_id,
        creado_en=model.creado_en,
        actualizado_en=model.actualizado_en,
    )


class SqlAlchemyProveedorRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _alcance(self, empresa_id: int, punto_emision_id: int):
        return (
            ProveedorModel.empresa_id == empresa_id,
            ProveedorModel.punto_emision_id == punto_emision_id,
        )

    async def obtener_por_id(self, proveedor_id: int, empresa_id: int, punto_emision_id: int) -> Proveedor | None:
        result = await self.session.execute(
            select(ProveedorModel).where(ProveedorModel.id == proveedor_id, *self._alcance(empresa_id, punto_emision_id))
        )
        model = result.scalar_one_or_none()
        return _proveedor(model) if model else None

    async def obtener_por_identificacion(
        self, identificacion: str, empresa_id: int, punto_emision_id: int
    ) -> Proveedor | None:
        result = await self.session.execute(
            select(ProveedorModel).where(
                ProveedorModel.identificacion == identificacion,
                *self._alcance(empresa_id, punto_emision_id),
            )
        )
        model = result.scalar_one_or_none()
        return _proveedor(model) if model else None

    async def listar(
        self, empresa_id: int, punto_emision_id: int, query: ListarProveedoresQuery
    ) -> tuple[list[Proveedor], int]:
        stmt = select(ProveedorModel).where(*self._alcance(empresa_id, punto_emision_id))
        if query.search:
            termino = f"%{query.search.strip()}%"
            stmt = stmt.where(
                or_(
                    ProveedorModel.nombres.ilike(termino),
                    ProveedorModel.identificacion.ilike(termino),
                    ProveedorModel.razon_social.ilike(termino),
                    ProveedorModel.correo.ilike(termino),
                )
            )
        if query.activo is not None:
            stmt = stmt.where(ProveedorModel.activo == query.activo)
        total = (await self.session.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
        stmt = stmt.order_by(func.lower(ProveedorModel.nombres), ProveedorModel.id)
        stmt = stmt.offset((query.page - 1) * query.size).limit(query.size)
        models = list((await self.session.execute(stmt)).scalars().all())
        return [_proveedor(model) for model in models], total

    async def guardar(self, proveedor: Proveedor) -> Proveedor:
        if proveedor.id is None:
            model = ProveedorModel(empresa_id=proveedor.empresa_id, punto_emision_id=proveedor.punto_emision_id)
            self.session.add(model)
        else:
            result = await self.session.execute(select(ProveedorModel).where(ProveedorModel.id == proveedor.id))
            model = result.scalar_one()
        model.identificacion = proveedor.identificacion
        model.nombres = proveedor.nombres
        model.tipo_persona = proveedor.tipo_persona
        model.razon_social = proveedor.razon_social
        model.direccion = proveedor.direccion
        model.telefono = proveedor.telefono
        model.correo = proveedor.correo
        model.direccion_fiscal = proveedor.direccion_fiscal
        model.telefono_fiscal = proveedor.telefono_fiscal
        model.correo_fiscal = proveedor.correo_fiscal
        model.notas = proveedor.notas
        model.activo = proveedor.activo
        await self.session.commit()
        await self.session.refresh(model)
        return _proveedor(model)

    async def eliminar(self, proveedor_id: int, empresa_id: int, punto_emision_id: int) -> bool:
        result = await self.session.execute(
            delete(ProveedorModel).where(ProveedorModel.id == proveedor_id, *self._alcance(empresa_id, punto_emision_id))
        )
        await self.session.commit()
        return result.rowcount > 0

    async def esta_en_uso(self, proveedor_id: int) -> bool:
        productos = (
            await self.session.execute(
                select(func.count()).select_from(ProductoProveedorModel).where(ProductoProveedorModel.proveedor_id == proveedor_id)
            )
        ).scalar_one()
        servicios = (
            await self.session.execute(
                select(func.count()).select_from(ServicioProveedorModel).where(ServicioProveedorModel.proveedor_id == proveedor_id)
            )
        ).scalar_one()
        return productos > 0 or servicios > 0


class SqlAlchemyPrecioProveedorRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def listar_producto(self, producto_id: int, empresa_id: int, punto_emision_id: int) -> list[PrecioProveedor]:
        result = await self.session.execute(
            select(ProductoProveedorModel)
            .options(selectinload(ProductoProveedorModel.proveedor))
            .join(ProveedorModel)
            .where(
                ProductoProveedorModel.producto_id == producto_id,
                ProveedorModel.empresa_id == empresa_id,
                ProveedorModel.punto_emision_id == punto_emision_id,
            )
            .order_by(ProductoProveedorModel.es_principal.desc(), ProductoProveedorModel.id)
        )
        return [_precio_producto(model) for model in result.scalars().all()]

    async def listar_servicio(self, servicio_id: int, empresa_id: int, punto_emision_id: int) -> list[PrecioProveedor]:
        result = await self.session.execute(
            select(ServicioProveedorModel)
            .options(selectinload(ServicioProveedorModel.proveedor))
            .join(ProveedorModel)
            .where(
                ServicioProveedorModel.servicio_id == servicio_id,
                ProveedorModel.empresa_id == empresa_id,
                ProveedorModel.punto_emision_id == punto_emision_id,
            )
            .order_by(ServicioProveedorModel.es_principal.desc(), ServicioProveedorModel.id)
        )
        return [_precio_servicio(model) for model in result.scalars().all()]

    async def obtener(self, relacion_id: int) -> PrecioProveedor | None:
        result = await self.session.execute(
            select(ProductoProveedorModel)
            .options(selectinload(ProductoProveedorModel.proveedor))
            .where(ProductoProveedorModel.id == relacion_id)
        )
        model = result.scalar_one_or_none()
        if model:
            return _precio_producto(model)
        result = await self.session.execute(
            select(ServicioProveedorModel)
            .options(selectinload(ServicioProveedorModel.proveedor))
            .where(ServicioProveedorModel.id == relacion_id)
        )
        model_s = result.scalar_one_or_none()
        return _precio_servicio(model_s) if model_s else None

    async def obtener_par_producto(self, producto_id: int, proveedor_id: int) -> PrecioProveedor | None:
        result = await self.session.execute(
            select(ProductoProveedorModel)
            .options(selectinload(ProductoProveedorModel.proveedor))
            .where(
                ProductoProveedorModel.producto_id == producto_id,
                ProductoProveedorModel.proveedor_id == proveedor_id,
            )
        )
        model = result.scalar_one_or_none()
        return _precio_producto(model) if model else None

    async def obtener_par_servicio(self, servicio_id: int, proveedor_id: int) -> PrecioProveedor | None:
        result = await self.session.execute(
            select(ServicioProveedorModel)
            .options(selectinload(ServicioProveedorModel.proveedor))
            .where(
                ServicioProveedorModel.servicio_id == servicio_id,
                ServicioProveedorModel.proveedor_id == proveedor_id,
            )
        )
        model = result.scalar_one_or_none()
        return _precio_servicio(model) if model else None

    async def guardar(self, precio: PrecioProveedor) -> PrecioProveedor:
        if precio.producto_id:
            if precio.id is None:
                model: ProductoProveedorModel | ServicioProveedorModel = ProductoProveedorModel(producto_id=precio.producto_id)
                self.session.add(model)
            else:
                result = await self.session.execute(select(ProductoProveedorModel).where(ProductoProveedorModel.id == precio.id))
                model = result.scalar_one()
            if precio.es_principal:
                await self.session.execute(
                    ProductoProveedorModel.__table__.update()
                    .where(ProductoProveedorModel.producto_id == precio.producto_id)
                    .values(es_principal=False)
                )
            model.proveedor_id = precio.proveedor_id
            model.precio_compra = precio.precio_compra
            model.es_principal = precio.es_principal
            await self.session.commit()
            await self.session.refresh(model)
            loaded = await self.obtener(model.id)
            return loaded or precio
        if precio.id is None:
            model_s = ServicioProveedorModel(servicio_id=precio.servicio_id)
            self.session.add(model_s)
        else:
            result = await self.session.execute(select(ServicioProveedorModel).where(ServicioProveedorModel.id == precio.id))
            model_s = result.scalar_one()
        if precio.es_principal:
            await self.session.execute(
                ServicioProveedorModel.__table__.update()
                .where(ServicioProveedorModel.servicio_id == precio.servicio_id)
                .values(es_principal=False)
            )
        model_s.proveedor_id = precio.proveedor_id
        model_s.precio_compra = precio.precio_compra
        model_s.es_principal = precio.es_principal
        await self.session.commit()
        await self.session.refresh(model_s)
        loaded = await self.obtener(model_s.id)
        return loaded or precio

    async def eliminar(self, relacion_id: int) -> bool:
        result = await self.session.execute(delete(ProductoProveedorModel).where(ProductoProveedorModel.id == relacion_id))
        if result.rowcount:
            await self.session.commit()
            return True
        result = await self.session.execute(delete(ServicioProveedorModel).where(ServicioProveedorModel.id == relacion_id))
        await self.session.commit()
        return result.rowcount > 0
