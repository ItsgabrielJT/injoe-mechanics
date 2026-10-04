from datetime import datetime, time
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.clientes.infrastructure.persistence.models import ClienteModel, VehiculoModel
from app.modules.estado_vehiculo.application.dto import ListarEstadoVehiculoQuery
from app.modules.estado_vehiculo.domain.entities import EstadoVehiculo, OrdenEstadoResumen, TotalesEstadoVehiculo
from app.modules.identidad.infrastructure.persistence.models import UsuarioModel
from app.modules.inventario.infrastructure.persistence.models import BodegaModel
from app.modules.ordenes_trabajo.domain.entities import OrdenTrabajoItem
from app.modules.ordenes_trabajo.infrastructure.persistence.models import OrdenTrabajoItemModel, OrdenTrabajoModel
from app.modules.proveedores.infrastructure.persistence.models import ProveedorModel

ECUADOR = ZoneInfo("America/Guayaquil")


def _item(model: OrdenTrabajoItemModel) -> OrdenTrabajoItem:
    return OrdenTrabajoItem(
        id=model.id,
        producto_id=model.producto_id,
        servicio_id=model.servicio_id,
        proveedor_id=model.proveedor_id,
        bodega_id=model.bodega_id,
        descripcion=model.descripcion,
        codigo=model.codigo,
        cantidad=Decimal(model.cantidad),
        precio_venta=Decimal(model.precio_venta),
        precio_compra=Decimal(model.precio_compra),
        aplica_iva=model.aplica_iva,
        tipo_impuesto=model.tipo_impuesto,
        utilidad=Decimal(model.utilidad),
        total=Decimal(model.total),
    )


class SqlAlchemyEstadoVehiculoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _rango_fechas(self, query: ListarEstadoVehiculoQuery) -> list:
        filtros = []
        if query.fecha_desde:
            filtros.append(
                OrdenTrabajoModel.fecha_inicio >= datetime.combine(query.fecha_desde, time.min, tzinfo=ECUADOR)
            )
        if query.fecha_hasta:
            filtros.append(
                OrdenTrabajoModel.fecha_inicio <= datetime.combine(query.fecha_hasta, time.max, tzinfo=ECUADOR)
            )
        return filtros

    def _filtros_vehiculo(self, query: ListarEstadoVehiculoQuery) -> list:
        filtros = []
        if query.placa:
            filtros.append(VehiculoModel.placa.ilike(f"%{query.placa.strip()}%"))
        if query.marca:
            filtros.append(VehiculoModel.marca.ilike(f"%{query.marca.strip()}%"))
        if query.modelo:
            filtros.append(VehiculoModel.modelo.ilike(f"%{query.modelo.strip()}%"))
        if query.cliente:
            filtros.append(ClienteModel.nombres.ilike(f"%{query.cliente.strip()}%"))
        if query.identificacion:
            filtros.append(ClienteModel.identificacion.ilike(f"%{query.identificacion.strip()}%"))
        return filtros

    def _existe_ot(self, empresa_id: int, punto_emision_id: int, query: ListarEstadoVehiculoQuery):
        return (
            select(1)
            .where(
                OrdenTrabajoModel.vehiculo_id == VehiculoModel.id,
                OrdenTrabajoModel.empresa_id == empresa_id,
                OrdenTrabajoModel.punto_emision_id == punto_emision_id,
                *self._rango_fechas(query),
            )
            .exists()
        )

    def _base_vehiculos(self, empresa_id: int, punto_emision_id: int, query: ListarEstadoVehiculoQuery):
        return (
            select(VehiculoModel)
            .join(ClienteModel, ClienteModel.id == VehiculoModel.cliente_id)
            .where(
                VehiculoModel.empresa_id == empresa_id,
                VehiculoModel.punto_emision_id == punto_emision_id,
                self._existe_ot(empresa_id, punto_emision_id, query),
                *self._filtros_vehiculo(query),
            )
        )

    async def _tecnicos(self, models: list[OrdenTrabajoModel]) -> dict[int, str]:
        ids = {model.tecnico_id for model in models}
        if not ids:
            return {}
        filas = (await self.session.execute(select(UsuarioModel).where(UsuarioModel.id.in_(ids)))).scalars()
        return {fila.id: fila.nombre_completo for fila in filas}

    async def _enriquecer_items(self, items: list[OrdenTrabajoItem]) -> list[OrdenTrabajoItem]:
        proveedor_ids = {item.proveedor_id for item in items if item.proveedor_id}
        bodega_ids = {item.bodega_id for item in items if item.bodega_id}
        proveedores = {}
        if proveedor_ids:
            proveedores = {
                row.id: row
                for row in (await self.session.execute(select(ProveedorModel).where(ProveedorModel.id.in_(proveedor_ids)))).scalars()
            }
        bodegas = {}
        if bodega_ids:
            bodegas = {
                row.id: row
                for row in (await self.session.execute(select(BodegaModel).where(BodegaModel.id.in_(bodega_ids)))).scalars()
            }
        for item in items:
            proveedor = proveedores.get(item.proveedor_id)
            item.proveedor_nombres = proveedor.nombres if proveedor else None
            bodega = bodegas.get(item.bodega_id) if item.bodega_id else None
            item.bodega_nombre = bodega.nombre if bodega else None
        return items

    def _resumen(self, model: OrdenTrabajoModel, tecnico: str | None, items: list[OrdenTrabajoItem] | None = None) -> OrdenEstadoResumen:
        return OrdenEstadoResumen(
            id=model.id,
            numero=model.numero,
            estado=model.estado,
            fecha_inicio=model.fecha_inicio,
            fecha_entrega=model.fecha_entrega,
            kilometraje=Decimal(model.kilometraje) if model.kilometraje is not None else None,
            tecnico_nombre=tecnico,
            total_costo=Decimal(model.total_costo),
            total_utilidad=Decimal(model.total_utilidad),
            total=Decimal(model.total),
            notas_generales=model.notas_generales,
            notas_tecnicas=model.notas_tecnicas,
            items=items or [],
        )

    async def _agregados_por_vehiculo(
        self, empresa_id: int, punto_emision_id: int, query: ListarEstadoVehiculoQuery, vehiculo_ids: list[int]
    ) -> dict[int, tuple[int, datetime | None, Decimal, Decimal, Decimal]]:
        if not vehiculo_ids:
            return {}
        filas = (
            await self.session.execute(
                select(
                    OrdenTrabajoModel.vehiculo_id,
                    func.count(OrdenTrabajoModel.id),
                    func.max(OrdenTrabajoModel.fecha_inicio),
                    func.coalesce(func.sum(OrdenTrabajoModel.total_costo), 0),
                    func.coalesce(func.sum(OrdenTrabajoModel.total_utilidad), 0),
                    func.coalesce(func.sum(OrdenTrabajoModel.total), 0),
                )
                .where(
                    OrdenTrabajoModel.empresa_id == empresa_id,
                    OrdenTrabajoModel.punto_emision_id == punto_emision_id,
                    OrdenTrabajoModel.vehiculo_id.in_(vehiculo_ids),
                    *self._rango_fechas(query),
                )
                .group_by(OrdenTrabajoModel.vehiculo_id)
            )
        ).all()
        return {
            fila[0]: (int(fila[1]), fila[2], Decimal(fila[3]), Decimal(fila[4]), Decimal(fila[5]))
            for fila in filas
        }

    async def _ordenes_de(
        self,
        empresa_id: int,
        punto_emision_id: int,
        query: ListarEstadoVehiculoQuery,
        vehiculo_ids: list[int],
        con_items: bool,
    ) -> dict[int, list[OrdenEstadoResumen]]:
        if not vehiculo_ids:
            return {}
        stmt = select(OrdenTrabajoModel).where(
            OrdenTrabajoModel.empresa_id == empresa_id,
            OrdenTrabajoModel.punto_emision_id == punto_emision_id,
            OrdenTrabajoModel.vehiculo_id.in_(vehiculo_ids),
            *self._rango_fechas(query),
        )
        if con_items:
            stmt = stmt.options(selectinload(OrdenTrabajoModel.items))
        stmt = stmt.order_by(OrdenTrabajoModel.fecha_inicio.desc(), OrdenTrabajoModel.id.desc())
        models = list((await self.session.execute(stmt)).scalars().unique().all())
        tecnicos = await self._tecnicos(models)
        agrupadas: dict[int, list[OrdenEstadoResumen]] = {vehiculo_id: [] for vehiculo_id in vehiculo_ids}
        items_por_orden: dict[int, list[OrdenTrabajoItem]] = {}
        if con_items:
            todos = [_item(linea) for model in models for linea in model.items]
            await self._enriquecer_items(todos)
            indice = 0
            for model in models:
                items_por_orden[model.id] = todos[indice : indice + len(model.items)]
                indice += len(model.items)
        for model in models:
            agrupadas[model.vehiculo_id].append(
                self._resumen(model, tecnicos.get(model.tecnico_id), items_por_orden.get(model.id, []))
            )
        return agrupadas

    def _estado(
        self,
        vehiculo: VehiculoModel,
        cliente: ClienteModel,
        agregados: tuple[int, datetime | None, Decimal, Decimal, Decimal] | None,
        ordenes: list[OrdenEstadoResumen],
    ) -> EstadoVehiculo:
        count, ultima, costo, utilidad, total = agregados or (len(ordenes), None, Decimal("0"), Decimal("0"), Decimal("0"))
        if ordenes and ultima is None:
            ultima = ordenes[0].fecha_inicio
        return EstadoVehiculo(
            vehiculo_id=vehiculo.id,
            placa=vehiculo.placa,
            marca=vehiculo.marca,
            modelo=vehiculo.modelo,
            anio=vehiculo.anio,
            color=vehiculo.color,
            cliente_id=cliente.id,
            cliente_nombres=cliente.nombres,
            cliente_identificacion=cliente.identificacion,
            ordenes_count=count,
            ultima_fecha=ultima,
            total_costo=costo,
            total_utilidad=utilidad,
            total=total,
            ordenes=ordenes,
        )

    async def listar(
        self, empresa_id: int, punto_emision_id: int, query: ListarEstadoVehiculoQuery
    ) -> tuple[list[EstadoVehiculo], int, TotalesEstadoVehiculo]:
        base = self._base_vehiculos(empresa_id, punto_emision_id, query)
        subq = base.with_only_columns(VehiculoModel.id, maintain_column_froms=True).subquery()
        total = (await self.session.execute(select(func.count()).select_from(subq))).scalar_one()
        ot_filtradas = (
            select(
                func.count(func.distinct(OrdenTrabajoModel.id)),
                func.coalesce(func.sum(OrdenTrabajoModel.total_costo), 0),
                func.coalesce(func.sum(OrdenTrabajoModel.total_utilidad), 0),
                func.coalesce(func.sum(OrdenTrabajoModel.total), 0),
            )
            .select_from(OrdenTrabajoModel)
            .where(
                OrdenTrabajoModel.empresa_id == empresa_id,
                OrdenTrabajoModel.punto_emision_id == punto_emision_id,
                OrdenTrabajoModel.vehiculo_id.in_(select(subq.c.id)),
                *self._rango_fechas(query),
            )
        )
        agregados = (await self.session.execute(ot_filtradas)).one()
        stmt = (
            base.order_by(VehiculoModel.placa.asc(), VehiculoModel.id.asc())
            .offset((query.page - 1) * query.size)
            .limit(query.size)
        )
        vehiculos = list((await self.session.execute(stmt)).scalars().unique().all())
        cliente_ids = {vehiculo.cliente_id for vehiculo in vehiculos}
        clientes = {
            fila.id: fila
            for fila in (await self.session.execute(select(ClienteModel).where(ClienteModel.id.in_(cliente_ids)))).scalars()
        } if cliente_ids else {}
        ids = [vehiculo.id for vehiculo in vehiculos]
        por_vehiculo = await self._agregados_por_vehiculo(empresa_id, punto_emision_id, query, ids)
        ordenes = await self._ordenes_de(empresa_id, punto_emision_id, query, ids, con_items=False)
        data = [
            self._estado(vehiculo, clientes[vehiculo.cliente_id], por_vehiculo.get(vehiculo.id), ordenes.get(vehiculo.id, []))
            for vehiculo in vehiculos
            if vehiculo.cliente_id in clientes
        ]
        return (
            data,
            total,
            TotalesEstadoVehiculo(
                vehiculos=total,
                ordenes=int(agregados[0] or 0),
                total_costo=Decimal(agregados[1]),
                total_utilidad=Decimal(agregados[2]),
                total=Decimal(agregados[3]),
            ),
        )

    async def obtener_historial(
        self,
        vehiculo_id: int,
        empresa_id: int,
        punto_emision_id: int,
        query: ListarEstadoVehiculoQuery,
    ) -> EstadoVehiculo | None:
        result = await self.session.execute(
            select(VehiculoModel)
            .join(ClienteModel, ClienteModel.id == VehiculoModel.cliente_id)
            .where(
                VehiculoModel.id == vehiculo_id,
                VehiculoModel.empresa_id == empresa_id,
                VehiculoModel.punto_emision_id == punto_emision_id,
                self._existe_ot(empresa_id, punto_emision_id, query),
            )
        )
        vehiculo = result.scalar_one_or_none()
        if vehiculo is None:
            return None
        cliente = (
            await self.session.execute(select(ClienteModel).where(ClienteModel.id == vehiculo.cliente_id))
        ).scalar_one()
        agregados = await self._agregados_por_vehiculo(empresa_id, punto_emision_id, query, [vehiculo_id])
        ordenes = await self._ordenes_de(empresa_id, punto_emision_id, query, [vehiculo_id], con_items=True)
        return self._estado(vehiculo, cliente, agregados.get(vehiculo_id), ordenes.get(vehiculo_id, []))
