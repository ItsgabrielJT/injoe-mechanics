from decimal import Decimal

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.clientes.infrastructure.persistence.models import ClienteModel, VehiculoModel
from app.modules.identidad.infrastructure.persistence.models import UsuarioModel
from app.modules.inventario.infrastructure.persistence.models import BodegaModel
from app.modules.ordenes_trabajo.application.dto import ListarOrdenesQuery
from app.modules.ordenes_trabajo.domain.entities import OrdenTrabajo, OrdenTrabajoItem, TotalesOrdenes
from app.modules.ordenes_trabajo.infrastructure.persistence.models import OrdenTrabajoItemModel, OrdenTrabajoModel
from app.modules.proveedores.infrastructure.persistence.models import ProveedorModel


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


def _orden(
    model: OrdenTrabajoModel,
    extras: dict | None = None,
    items: list[OrdenTrabajoItem] | None = None,
) -> OrdenTrabajo:
    extra = extras or {}
    return OrdenTrabajo(
        id=model.id,
        empresa_id=model.empresa_id,
        punto_emision_id=model.punto_emision_id,
        numero=model.numero,
        cliente_id=model.cliente_id,
        vehiculo_id=model.vehiculo_id,
        tecnico_id=model.tecnico_id,
        estado=model.estado,
        fecha_inicio=model.fecha_inicio,
        fecha_entrega=model.fecha_entrega,
        kilometraje=Decimal(model.kilometraje) if model.kilometraje is not None else None,
        notas_generales=model.notas_generales,
        notas_tecnicas=model.notas_tecnicas,
        total_productos=Decimal(model.total_productos),
        total_servicios=Decimal(model.total_servicios),
        total_costo=Decimal(model.total_costo),
        total_utilidad=Decimal(model.total_utilidad),
        total=Decimal(model.total),
        cliente_nombres=extra.get("cliente_nombres"),
        cliente_identificacion=extra.get("cliente_identificacion"),
        vehiculo_placa=extra.get("vehiculo_placa"),
        vehiculo_marca=extra.get("vehiculo_marca"),
        vehiculo_modelo=extra.get("vehiculo_modelo"),
        tecnico_nombre=extra.get("tecnico_nombre"),
        items=items if items is not None else [_item(linea) for linea in model.items],
        creado_en=model.creado_en,
        actualizado_en=model.actualizado_en,
    )


class SqlAlchemyOrdenTrabajoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _alcance(self, empresa_id: int, punto_emision_id: int):
        return (
            OrdenTrabajoModel.empresa_id == empresa_id,
            OrdenTrabajoModel.punto_emision_id == punto_emision_id,
        )

    async def _extras(self, models: list[OrdenTrabajoModel]) -> dict[int, dict]:
        if not models:
            return {}
        cliente_ids = {model.cliente_id for model in models}
        vehiculo_ids = {model.vehiculo_id for model in models}
        tecnico_ids = {model.tecnico_id for model in models}
        clientes = {
            row.id: row
            for row in (await self.session.execute(select(ClienteModel).where(ClienteModel.id.in_(cliente_ids)))).scalars()
        }
        vehiculos = {
            row.id: row
            for row in (await self.session.execute(select(VehiculoModel).where(VehiculoModel.id.in_(vehiculo_ids)))).scalars()
        }
        tecnicos = {
            row.id: row
            for row in (await self.session.execute(select(UsuarioModel).where(UsuarioModel.id.in_(tecnico_ids)))).scalars()
        }
        extra: dict[int, dict] = {}
        for model in models:
            cliente = clientes.get(model.cliente_id)
            vehiculo = vehiculos.get(model.vehiculo_id)
            tecnico = tecnicos.get(model.tecnico_id)
            extra[model.id] = {
                "cliente_nombres": cliente.nombres if cliente else None,
                "cliente_identificacion": cliente.identificacion if cliente else None,
                "vehiculo_placa": vehiculo.placa if vehiculo else None,
                "vehiculo_marca": vehiculo.marca if vehiculo else None,
                "vehiculo_modelo": vehiculo.modelo if vehiculo else None,
                "tecnico_nombre": tecnico.nombre_completo if tecnico else None,
            }
        return extra

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

    async def obtener_por_id(self, orden_id: int, empresa_id: int, punto_emision_id: int) -> OrdenTrabajo | None:
        result = await self.session.execute(
            select(OrdenTrabajoModel)
            .options(selectinload(OrdenTrabajoModel.items))
            .where(OrdenTrabajoModel.id == orden_id, *self._alcance(empresa_id, punto_emision_id))
        )
        model = result.scalar_one_or_none()
        if model is None:
            return None
        extras = await self._extras([model])
        items = await self._enriquecer_items([_item(linea) for linea in model.items])
        return _orden(model, extras.get(model.id), items)

    async def siguiente_numero(self, empresa_id: int, punto_emision_id: int) -> str:
        result = await self.session.execute(
            select(func.max(OrdenTrabajoModel.numero)).where(*self._alcance(empresa_id, punto_emision_id))
        )
        actual = result.scalar_one_or_none()
        siguiente = 1
        if actual and actual.startswith("OT-"):
            try:
                siguiente = int(actual.split("-")[1]) + 1
            except ValueError:
                siguiente = 1
        return f"OT-{siguiente:06d}"

    def _filtrar(self, stmt, query: ListarOrdenesQuery):
        if query.estado:
            stmt = stmt.where(OrdenTrabajoModel.estado == query.estado)
        if query.tecnico_id:
            stmt = stmt.where(OrdenTrabajoModel.tecnico_id == query.tecnico_id)
        if query.search:
            termino = f"%{query.search.strip()}%"
            stmt = (
                stmt.join(ClienteModel, ClienteModel.id == OrdenTrabajoModel.cliente_id)
                .join(VehiculoModel, VehiculoModel.id == OrdenTrabajoModel.vehiculo_id)
                .where(
                    or_(
                        OrdenTrabajoModel.numero.ilike(termino),
                        ClienteModel.nombres.ilike(termino),
                        ClienteModel.identificacion.ilike(termino),
                        VehiculoModel.placa.ilike(termino),
                        VehiculoModel.marca.ilike(termino),
                        VehiculoModel.modelo.ilike(termino),
                    )
                )
            )
        return stmt

    async def listar(
        self, empresa_id: int, punto_emision_id: int, query: ListarOrdenesQuery
    ) -> tuple[list[OrdenTrabajo], int, TotalesOrdenes]:
        base = select(OrdenTrabajoModel).where(*self._alcance(empresa_id, punto_emision_id))
        filtrado = self._filtrar(base, query)
        subq = filtrado.subquery()
        total = (await self.session.execute(select(func.count()).select_from(subq))).scalar_one()
        agregados = (
            await self.session.execute(
                select(
                    func.coalesce(func.sum(subq.c.total_costo), 0),
                    func.coalesce(func.sum(subq.c.total_utilidad), 0),
                    func.coalesce(func.sum(subq.c.total), 0),
                ).select_from(subq)
            )
        ).one()
        stmt = (
            filtrado.options(selectinload(OrdenTrabajoModel.items))
            .order_by(OrdenTrabajoModel.fecha_inicio.desc(), OrdenTrabajoModel.id.desc())
            .offset((query.page - 1) * query.size)
            .limit(query.size)
        )
        models = list((await self.session.execute(stmt)).scalars().unique().all())
        extras = await self._extras(models)
        ordenes = [_orden(model, extras.get(model.id), []) for model in models]
        return (
            ordenes,
            total,
            TotalesOrdenes(
                total_costo=Decimal(agregados[0]),
                total_utilidad=Decimal(agregados[1]),
                total=Decimal(agregados[2]),
            ),
        )

    async def guardar(self, orden: OrdenTrabajo) -> OrdenTrabajo:
        if orden.id is None:
            model = OrdenTrabajoModel(empresa_id=orden.empresa_id, punto_emision_id=orden.punto_emision_id)
            self.session.add(model)
        else:
            result = await self.session.execute(
                select(OrdenTrabajoModel).options(selectinload(OrdenTrabajoModel.items)).where(OrdenTrabajoModel.id == orden.id)
            )
            model = result.scalar_one()
            model.items.clear()
        model.numero = orden.numero
        model.cliente_id = orden.cliente_id
        model.vehiculo_id = orden.vehiculo_id
        model.tecnico_id = orden.tecnico_id
        model.estado = orden.estado
        model.fecha_inicio = orden.fecha_inicio
        model.fecha_entrega = orden.fecha_entrega
        model.kilometraje = orden.kilometraje
        model.notas_generales = orden.notas_generales
        model.notas_tecnicas = orden.notas_tecnicas
        model.total_productos = orden.total_productos
        model.total_servicios = orden.total_servicios
        model.total_costo = orden.total_costo
        model.total_utilidad = orden.total_utilidad
        model.total = orden.total
        for item in orden.items:
            model.items.append(
                OrdenTrabajoItemModel(
                    producto_id=item.producto_id,
                    servicio_id=item.servicio_id,
                    proveedor_id=item.proveedor_id,
                    bodega_id=item.bodega_id,
                    descripcion=item.descripcion,
                    codigo=item.codigo,
                    cantidad=item.cantidad,
                    precio_venta=item.precio_venta,
                    precio_compra=item.precio_compra,
                    aplica_iva=item.aplica_iva,
                    tipo_impuesto=item.tipo_impuesto,
                    utilidad=item.utilidad,
                    total=item.total,
                )
            )
        await self.session.commit()
        await self.session.refresh(model)
        return await self.obtener_por_id(model.id, orden.empresa_id, orden.punto_emision_id)  # type: ignore[return-value]

    async def eliminar(self, orden_id: int, empresa_id: int, punto_emision_id: int) -> bool:
        result = await self.session.execute(
            delete(OrdenTrabajoModel).where(OrdenTrabajoModel.id == orden_id, *self._alcance(empresa_id, punto_emision_id))
        )
        await self.session.commit()
        return result.rowcount > 0
