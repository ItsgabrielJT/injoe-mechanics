from decimal import Decimal

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.servicios.application.dto import ListarServiciosQuery
from app.modules.servicios.domain.entities import Servicio
from app.modules.servicios.infrastructure.persistence.models import ServicioModel


def _servicio_desde_modelo(model: ServicioModel) -> Servicio:
    return Servicio(
        id=model.id,
        empresa_id=model.empresa_id,
        punto_emision_id=model.punto_emision_id,
        codigo=model.codigo,
        nombre=model.nombre,
        tipo_impuesto=model.tipo_impuesto,
        precio_venta=Decimal(model.precio_venta),
        descripcion=model.descripcion,
        categoria=model.categoria,
        aplica_iva=model.aplica_iva,
        peso=Decimal(model.peso) if model.peso is not None else None,
        activo=model.activo,
        creado_en=model.creado_en,
        actualizado_en=model.actualizado_en,
    )


class SqlAlchemyServicioRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _alcance(self, empresa_id: int, punto_emision_id: int):
        return (
            ServicioModel.empresa_id == empresa_id,
            ServicioModel.punto_emision_id == punto_emision_id,
        )

    async def obtener_por_id(
        self,
        servicio_id: int,
        empresa_id: int,
        punto_emision_id: int,
    ) -> Servicio | None:
        result = await self.session.execute(
            select(ServicioModel).where(
                ServicioModel.id == servicio_id,
                *self._alcance(empresa_id, punto_emision_id),
            )
        )
        model = result.scalar_one_or_none()
        return _servicio_desde_modelo(model) if model else None

    async def obtener_por_codigo(
        self,
        codigo: str,
        empresa_id: int,
        punto_emision_id: int,
    ) -> Servicio | None:
        result = await self.session.execute(
            select(ServicioModel).where(
                func.upper(ServicioModel.codigo) == codigo.upper(),
                *self._alcance(empresa_id, punto_emision_id),
            )
        )
        model = result.scalar_one_or_none()
        return _servicio_desde_modelo(model) if model else None

    async def listar(
        self,
        empresa_id: int,
        punto_emision_id: int,
        query: ListarServiciosQuery,
    ) -> tuple[list[Servicio], int]:
        stmt = select(ServicioModel).where(*self._alcance(empresa_id, punto_emision_id))
        if query.search:
            termino = f"%{query.search.strip()}%"
            stmt = stmt.where(
                or_(
                    ServicioModel.codigo.ilike(termino),
                    ServicioModel.nombre.ilike(termino),
                    ServicioModel.descripcion.ilike(termino),
                )
            )
        if query.categoria:
            stmt = stmt.where(ServicioModel.categoria == query.categoria)
        if query.activo is not None:
            stmt = stmt.where(ServicioModel.activo == query.activo)

        total = (await self.session.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
        stmt = stmt.order_by(func.lower(ServicioModel.nombre), ServicioModel.id)
        stmt = stmt.offset((query.page - 1) * query.size).limit(query.size)
        models = list((await self.session.execute(stmt)).scalars().all())
        return [_servicio_desde_modelo(model) for model in models], total

    async def guardar(self, servicio: Servicio) -> Servicio:
        if servicio.id is None:
            model = ServicioModel(
                empresa_id=servicio.empresa_id,
                punto_emision_id=servicio.punto_emision_id,
            )
            self.session.add(model)
        else:
            result = await self.session.execute(select(ServicioModel).where(ServicioModel.id == servicio.id))
            model = result.scalar_one()

        model.codigo = servicio.codigo
        model.nombre = servicio.nombre
        model.descripcion = servicio.descripcion
        model.categoria = servicio.categoria
        model.precio_venta = servicio.precio_venta
        model.aplica_iva = servicio.aplica_iva
        model.tipo_impuesto = servicio.tipo_impuesto
        model.peso = servicio.peso
        model.activo = servicio.activo
        await self.session.commit()
        await self.session.refresh(model)
        return _servicio_desde_modelo(model)

    async def eliminar(self, servicio_id: int, empresa_id: int, punto_emision_id: int) -> bool:
        result = await self.session.execute(
            delete(ServicioModel).where(
                ServicioModel.id == servicio_id,
                *self._alcance(empresa_id, punto_emision_id),
            )
        )
        await self.session.commit()
        return result.rowcount > 0
