from datetime import date
from decimal import Decimal

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.clientes.infrastructure.persistence.models import ClienteModel
from app.modules.facturacion.application.dto import (
    EstadisticasFactura,
    EstadoEstadistica,
    ImpuestoEstadistica,
    ListarFacturasQuery,
    TotalesFactura,
)
from app.modules.facturacion.domain.entities import (
    EstadoFactura,
    Factura,
    FacturaItem,
    FormaPago,
    FormaPagoSri,
    TipoReceptor,
)
from app.modules.facturacion.infrastructure.persistence.models import (
    FacturaItemModel,
    FacturaModel,
    FormaPagoModel,
    FormaPagoSriModel,
)
from app.modules.identidad.infrastructure.persistence.models import EmpresaModel, PuntoEmisionModel
from app.modules.inventario.infrastructure.persistence.models import BodegaModel, ProductoModel


def _item(model: FacturaItemModel) -> FacturaItem:
    return FacturaItem(
        id=model.id,
        producto_id=model.producto_id,
        servicio_id=model.servicio_id,
        descripcion=model.descripcion,
        codigo=model.codigo,
        cantidad=Decimal(model.cantidad),
        precio_unitario=Decimal(model.precio_unitario),
        descuento_porcentaje=Decimal(model.descuento_porcentaje),
        aplica_iva=model.aplica_iva,
        tipo_impuesto=model.tipo_impuesto,
        bodega_id=model.bodega_id,
        bodega_nombre=None,
        subtotal=Decimal(model.subtotal),
        iva_amount=Decimal(model.iva_amount),
        ice_amount=Decimal(model.ice_amount),
        irbpnr_amount=Decimal(model.irbpnr_amount),
        total=Decimal(model.total),
    )


def _correo_cliente(cliente: ClienteModel | None) -> str | None:
    if cliente is None:
        return None
    if cliente.correo_fiscal:
        return cliente.correo_fiscal
    if cliente.correos:
        idx = cliente.indice_correo_principal or 0
        if 0 <= idx < len(cliente.correos):
            return cliente.correos[idx]
        return cliente.correos[0]
    return None


def _telefono_cliente(cliente: ClienteModel | None) -> str | None:
    if cliente is None:
        return None
    if cliente.telefono_fiscal:
        return cliente.telefono_fiscal
    if cliente.telefonos:
        idx = cliente.indice_telefono_principal or 0
        if 0 <= idx < len(cliente.telefonos):
            return cliente.telefonos[idx]
        return cliente.telefonos[0]
    return None


def _factura(model: FacturaModel, cliente: ClienteModel | None = None) -> Factura:
    return Factura(
        id=model.id,
        empresa_id=model.empresa_id,
        punto_emision_id=model.punto_emision_id,
        usuario_id=model.usuario_id,
        numero=model.numero,
        tipo_receptor=model.tipo_receptor,
        estado=model.estado,
        fecha_emision=model.fecha_emision,
        cliente_id=model.cliente_id,
        orden_trabajo_id=model.orden_trabajo_id,
        forma_pago_id=model.forma_pago_id,
        fecha_vencimiento=model.fecha_vencimiento,
        fecha_pago=model.fecha_pago,
        fecha_autorizacion=model.fecha_autorizacion,
        clave_acceso=model.clave_acceso,
        xml_content=model.xml_content,
        reason_error=model.reason_error,
        numero_autorizacion=model.numero_autorizacion,
        subtotal_15=Decimal(model.subtotal_15),
        subtotal_5=Decimal(model.subtotal_5),
        subtotal_0=Decimal(model.subtotal_0),
        subtotal_objeto=Decimal(model.subtotal_objeto),
        subtotal_exento=Decimal(model.subtotal_exento),
        iva_15=Decimal(model.iva_15),
        iva_5=Decimal(model.iva_5),
        ice=Decimal(model.ice),
        irbpnr=Decimal(model.irbpnr),
        descuento=Decimal(model.descuento),
        total=Decimal(model.total),
        notas=model.notas,
        terminos=model.terminos,
        cliente_nombres=cliente.nombres if cliente else None,
        cliente_identificacion=cliente.identificacion if cliente else None,
        cliente_correo=_correo_cliente(cliente),
        cliente_direccion=(cliente.direccion_fiscal or (cliente.direcciones[0] if cliente and cliente.direcciones else None)) if cliente else None,
        cliente_telefono=_telefono_cliente(cliente),
        forma_pago_nombre=model.forma_pago.nombre if model.forma_pago else None,
        forma_pago_sri_codigo=(
            model.forma_pago.forma_pago_sri.codigo
            if model.forma_pago and model.forma_pago.forma_pago_sri
            else None
        ),
        items=[_item(linea) for linea in model.items],
        creado_en=model.creado_en,
        actualizado_en=model.actualizado_en,
    )


class SqlAlchemyFacturaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _alcance(self, empresa_id: int, punto_emision_id: int):
        return (
            FacturaModel.empresa_id == empresa_id,
            FacturaModel.punto_emision_id == punto_emision_id,
        )

    def _filtros(self, empresa_id: int, punto_emision_id: int, query: ListarFacturasQuery):
        filtros = [*self._alcance(empresa_id, punto_emision_id)]
        if query.estado:
            filtros.append(FacturaModel.estado == query.estado)
        if query.cliente_id:
            filtros.append(FacturaModel.cliente_id == query.cliente_id)
        if query.fecha_desde:
            filtros.append(FacturaModel.fecha_emision >= query.fecha_desde)
        if query.fecha_hasta:
            filtros.append(FacturaModel.fecha_emision <= query.fecha_hasta)
        if query.search:
            like = f"%{query.search.strip()}%"
            cliente_ids = select(ClienteModel.id).where(
                ClienteModel.empresa_id == empresa_id,
                ClienteModel.punto_emision_id == punto_emision_id,
                or_(
                    ClienteModel.nombres.ilike(like),
                    ClienteModel.identificacion.ilike(like),
                    ClienteModel.razon_social.ilike(like),
                ),
            )
            condiciones = [
                FacturaModel.numero.ilike(like),
                FacturaModel.clave_acceso.ilike(like),
                FacturaModel.cliente_id.in_(cliente_ids),
            ]
            if "consumidor" in query.search.strip().lower():
                condiciones.append(FacturaModel.tipo_receptor == TipoReceptor.CONSUMIDOR_FINAL)
            filtros.append(or_(*condiciones))
        return filtros

    async def _cliente(self, cliente_id: int | None) -> ClienteModel | None:
        if not cliente_id:
            return None
        return await self.session.get(ClienteModel, cliente_id)

    async def _nombres_bodega(self, facturas: list[Factura]) -> list[Factura]:
        ids_bodega = {item.bodega_id for factura in facturas for item in factura.items if item.bodega_id}
        ids_producto = {item.producto_id for factura in facturas for item in factura.items if item.producto_id}
        nombres: dict[int, str] = {}
        inventario: dict[int, bool] = {}
        if ids_bodega:
            filas = (await self.session.execute(select(BodegaModel.id, BodegaModel.nombre).where(BodegaModel.id.in_(ids_bodega)))).all()
            nombres = {fila.id: fila.nombre for fila in filas}
        if ids_producto:
            filas = (
                await self.session.execute(
                    select(ProductoModel.id, ProductoModel.aplica_inventario).where(ProductoModel.id.in_(ids_producto))
                )
            ).all()
            inventario = {fila.id: bool(fila.aplica_inventario) for fila in filas}
        for factura in facturas:
            for item in factura.items:
                if item.bodega_id:
                    item.bodega_nombre = nombres.get(item.bodega_id)
                if item.producto_id:
                    item.aplica_inventario = inventario.get(item.producto_id, False)
        return facturas

    async def obtener(self, factura_id: int, empresa_id: int, punto_emision_id: int) -> Factura | None:
        resultado = await self.session.execute(
            select(FacturaModel)
            .options(selectinload(FacturaModel.items), selectinload(FacturaModel.forma_pago).selectinload(FormaPagoModel.forma_pago_sri))
            .where(FacturaModel.id == factura_id, *self._alcance(empresa_id, punto_emision_id))
        )
        modelo = resultado.scalars().first()
        if modelo is None:
            return None
        factura = _factura(modelo, await self._cliente(modelo.cliente_id))
        return (await self._nombres_bodega([factura]))[0]

    async def obtener_por_orden(self, orden_id: int, empresa_id: int, punto_emision_id: int) -> Factura | None:
        resultado = await self.session.execute(
            select(FacturaModel)
            .options(selectinload(FacturaModel.items), selectinload(FacturaModel.forma_pago).selectinload(FormaPagoModel.forma_pago_sri))
            .where(
                FacturaModel.orden_trabajo_id == orden_id,
                FacturaModel.estado != EstadoFactura.CANCELADA,
                *self._alcance(empresa_id, punto_emision_id),
            )
        )
        modelo = resultado.scalars().first()
        if modelo is None:
            return None
        factura = _factura(modelo, await self._cliente(modelo.cliente_id))
        return (await self._nombres_bodega([factura]))[0]

    async def listar(
        self, empresa_id: int, punto_emision_id: int, query: ListarFacturasQuery
    ) -> tuple[list[Factura], int]:
        filtros = self._filtros(empresa_id, punto_emision_id, query)
        total = await self.session.scalar(select(func.count()).select_from(FacturaModel).where(*filtros)) or 0
        resultado = await self.session.execute(
            select(FacturaModel)
            .options(selectinload(FacturaModel.items), selectinload(FacturaModel.forma_pago).selectinload(FormaPagoModel.forma_pago_sri))
            .where(*filtros)
            .order_by(FacturaModel.creado_en.desc())
            .offset((query.page - 1) * query.size)
            .limit(query.size)
        )
        modelos = list(resultado.scalars().unique().all())
        clientes = {}
        ids = {m.cliente_id for m in modelos if m.cliente_id}
        if ids:
            clientes = {
                row.id: row
                for row in (await self.session.execute(select(ClienteModel).where(ClienteModel.id.in_(ids)))).scalars()
            }
        facturas = [_factura(modelo, clientes.get(modelo.cliente_id) if modelo.cliente_id else None) for modelo in modelos]
        return await self._nombres_bodega(facturas), total

    async def totales(self, empresa_id: int, punto_emision_id: int, query: ListarFacturasQuery) -> TotalesFactura:
        filtros = self._filtros(empresa_id, punto_emision_id, query)
        subtotal_expr = (
            func.coalesce(FacturaModel.subtotal_15, 0)
            + func.coalesce(FacturaModel.subtotal_5, 0)
            + func.coalesce(FacturaModel.subtotal_0, 0)
            + func.coalesce(FacturaModel.subtotal_objeto, 0)
            + func.coalesce(FacturaModel.subtotal_exento, 0)
        )
        fila = (
            await self.session.execute(
                select(
                    func.count(FacturaModel.id),
                    func.coalesce(func.sum(subtotal_expr), 0),
                    func.coalesce(func.sum(FacturaModel.iva_15), 0),
                    func.coalesce(func.sum(FacturaModel.iva_5), 0),
                    func.coalesce(func.sum(FacturaModel.total), 0),
                ).where(*filtros)
            )
        ).one()
        return TotalesFactura(
            cantidad=int(fila[0] or 0),
            subtotal=Decimal(str(fila[1] or 0)),
            iva_15=Decimal(str(fila[2] or 0)),
            iva_5=Decimal(str(fila[3] or 0)),
            iva_0=Decimal("0"),
            total=Decimal(str(fila[4] or 0)),
        )

    async def estadisticas(
        self, empresa_id: int, punto_emision_id: int, query: ListarFacturasQuery
    ) -> EstadisticasFactura:
        filtros = self._filtros(empresa_id, punto_emision_id, query)
        subtotal_expr = (
            func.coalesce(FacturaModel.subtotal_15, 0)
            + func.coalesce(FacturaModel.subtotal_5, 0)
            + func.coalesce(FacturaModel.subtotal_0, 0)
            + func.coalesce(FacturaModel.subtotal_objeto, 0)
            + func.coalesce(FacturaModel.subtotal_exento, 0)
        )
        filas = (
            await self.session.execute(
                select(
                    FacturaModel.estado,
                    func.count(FacturaModel.id),
                    func.coalesce(func.sum(subtotal_expr), 0),
                    func.coalesce(func.sum(FacturaModel.iva_15), 0),
                    func.coalesce(func.sum(FacturaModel.iva_5), 0),
                    func.coalesce(func.sum(FacturaModel.subtotal_0), 0),
                    func.coalesce(func.sum(FacturaModel.subtotal_objeto), 0),
                    func.coalesce(func.sum(FacturaModel.subtotal_exento), 0),
                    func.coalesce(func.sum(FacturaModel.total), 0),
                )
                .where(*filtros)
                .group_by(FacturaModel.estado)
            )
        ).all()
        mapa: dict[EstadoFactura, EstadoEstadistica] = {}
        for estado, cantidad, subtotal, iva_15, iva_5, sub_0, objeto, exento, total in filas:
            try:
                clave = EstadoFactura(estado)
            except ValueError:
                continue
            mapa[clave] = EstadoEstadistica(
                estado=clave,
                cantidad=int(cantidad or 0),
                subtotal=Decimal(str(subtotal or 0)),
                iva_15=Decimal(str(iva_15 or 0)),
                iva_5=Decimal(str(iva_5 or 0)),
                iva_0=Decimal("0"),
                total=Decimal(str(total or 0)),
            )
        for estado in EstadoFactura:
            mapa.setdefault(estado, EstadoEstadistica(estado=estado))
        numeros = (
            await self.session.execute(
                select(FacturaModel.estado, FacturaModel.numero)
                .where(*filtros)
                .order_by(FacturaModel.fecha_emision.desc(), FacturaModel.id.desc())
            )
        ).all()
        for estado, numero in numeros:
            try:
                clave = EstadoFactura(estado)
            except ValueError:
                continue
            if numero:
                mapa[clave].numeros.append(str(numero))
        impuestos = (
            await self.session.execute(
                select(
                    func.coalesce(func.sum(FacturaModel.subtotal_0 + FacturaModel.subtotal_objeto + FacturaModel.subtotal_exento), 0),
                    func.coalesce(func.sum(FacturaModel.subtotal_5), 0),
                    func.coalesce(func.sum(FacturaModel.iva_5), 0),
                    func.coalesce(func.sum(FacturaModel.subtotal_15), 0),
                    func.coalesce(func.sum(FacturaModel.iva_15), 0),
                ).where(*filtros)
            )
        ).one()
        s0, s5, i5, s15, i15 = (Decimal(str(valor or 0)) for valor in impuestos)
        totales = await self.totales(empresa_id, punto_emision_id, query)
        return EstadisticasFactura(
            fecha_desde=query.fecha_desde,
            fecha_hasta=query.fecha_hasta,
            por_estado=[mapa[estado] for estado in EstadoFactura],
            totales=totales,
            por_impuesto=[
                ImpuestoEstadistica(tasa=0, subtotal=s0, iva=Decimal("0"), total=s0),
                ImpuestoEstadistica(tasa=5, subtotal=s5, iva=i5, total=s5 + i5),
                ImpuestoEstadistica(tasa=15, subtotal=s15, iva=i15, total=s15 + i15),
            ],
        )

    async def facturas_por_ordenes(self, orden_ids: list[int], empresa_id: int, punto_emision_id: int) -> dict[int, Factura]:
        if not orden_ids:
            return {}
        resultado = await self.session.execute(
            select(FacturaModel)
            .options(selectinload(FacturaModel.items), selectinload(FacturaModel.forma_pago).selectinload(FormaPagoModel.forma_pago_sri))
            .where(
                FacturaModel.orden_trabajo_id.in_(orden_ids),
                FacturaModel.estado != EstadoFactura.CANCELADA,
                *self._alcance(empresa_id, punto_emision_id),
            )
        )
        mapa: dict[int, Factura] = {}
        for modelo in resultado.scalars().unique().all():
            if modelo.orden_trabajo_id:
                mapa[modelo.orden_trabajo_id] = _factura(modelo)
        return mapa

    async def guardar(self, factura: Factura) -> Factura:
        if factura.id:
            modelo = await self.session.get(FacturaModel, factura.id, options=[selectinload(FacturaModel.items)])
            if modelo is None:
                return factura
            modelo.items.clear()
        else:
            modelo = FacturaModel(
                empresa_id=factura.empresa_id,
                punto_emision_id=factura.punto_emision_id,
                usuario_id=factura.usuario_id,
            )
            self.session.add(modelo)
        modelo.cliente_id = factura.cliente_id
        modelo.orden_trabajo_id = factura.orden_trabajo_id
        modelo.forma_pago_id = factura.forma_pago_id
        modelo.numero = factura.numero
        modelo.tipo_receptor = factura.tipo_receptor
        modelo.estado = factura.estado
        modelo.clave_acceso = factura.clave_acceso
        modelo.xml_content = factura.xml_content
        modelo.reason_error = factura.reason_error
        modelo.numero_autorizacion = factura.numero_autorizacion
        modelo.fecha_emision = factura.fecha_emision
        modelo.fecha_vencimiento = factura.fecha_vencimiento
        modelo.fecha_pago = factura.fecha_pago
        modelo.fecha_autorizacion = factura.fecha_autorizacion
        modelo.subtotal_15 = factura.subtotal_15
        modelo.subtotal_5 = factura.subtotal_5
        modelo.subtotal_0 = factura.subtotal_0
        modelo.subtotal_objeto = factura.subtotal_objeto
        modelo.subtotal_exento = factura.subtotal_exento
        modelo.iva_15 = factura.iva_15
        modelo.iva_5 = factura.iva_5
        modelo.ice = factura.ice
        modelo.irbpnr = factura.irbpnr
        modelo.descuento = factura.descuento
        modelo.total = factura.total
        modelo.notas = factura.notas
        modelo.terminos = factura.terminos
        for item in factura.items:
            modelo.items.append(
                FacturaItemModel(
                    producto_id=item.producto_id,
                    servicio_id=item.servicio_id,
                    descripcion=item.descripcion,
                    codigo=item.codigo,
                    cantidad=item.cantidad,
                    precio_unitario=item.precio_unitario,
                    descuento_porcentaje=item.descuento_porcentaje,
                    aplica_iva=item.aplica_iva,
                    tipo_impuesto=item.tipo_impuesto,
                    bodega_id=item.bodega_id,
                    subtotal=item.subtotal,
                    iva_amount=item.iva_amount,
                    ice_amount=item.ice_amount,
                    irbpnr_amount=item.irbpnr_amount,
                    total=item.total,
                )
            )
        await self.session.commit()
        return await self.obtener(modelo.id, factura.empresa_id, factura.punto_emision_id) or factura

    async def eliminar(self, factura_id: int, empresa_id: int, punto_emision_id: int) -> bool:
        resultado = await self.session.execute(
            delete(FacturaModel).where(FacturaModel.id == factura_id, *self._alcance(empresa_id, punto_emision_id))
        )
        await self.session.commit()
        return resultado.rowcount > 0

    async def siguiente_numero(self, empresa_id: int, punto_emision_id: int) -> str:
        resultado = await self.session.execute(
            select(PuntoEmisionModel).where(
                PuntoEmisionModel.id == punto_emision_id,
                PuntoEmisionModel.empresa_id == empresa_id,
            ).with_for_update()
        )
        punto = resultado.scalars().first()
        if punto is None:
            raise ValueError("Punto de emisión no encontrado")
        siguiente = int(punto.factura_seq or 0) + 1
        codigo = str(punto.codigo).zfill(3) if str(punto.codigo).isdigit() else str(punto.codigo)
        emision = str(punto.punto_emision).zfill(3) if str(punto.punto_emision).isdigit() else str(punto.punto_emision)
        while True:
            numero = f"{codigo}-{emision}-{siguiente:09d}"
            existe = await self.session.scalar(
                select(FacturaModel.id).where(
                    FacturaModel.empresa_id == empresa_id,
                    FacturaModel.punto_emision_id == punto_emision_id,
                    FacturaModel.numero == numero,
                )
            )
            if not existe:
                break
            siguiente += 1
        punto.factura_seq = siguiente
        await self.session.commit()
        return numero

    async def decrementar_secuencial(self, empresa_id: int, punto_emision_id: int, numero: str) -> None:
        resultado = await self.session.execute(
            select(PuntoEmisionModel).where(
                PuntoEmisionModel.id == punto_emision_id,
                PuntoEmisionModel.empresa_id == empresa_id,
            ).with_for_update()
        )
        punto = resultado.scalars().first()
        if punto is None:
            return
        try:
            seq_doc = int(numero.split("-")[-1])
        except (ValueError, IndexError):
            return
        actual = int(punto.factura_seq or 0)
        if seq_doc == actual and actual > 0:
            punto.factura_seq = actual - 1
            await self.session.commit()

    async def listar_formas_pago(self, empresa_id: int, punto_emision_id: int) -> list[FormaPago]:
        resultado = await self.session.execute(
            select(FormaPagoModel)
            .options(selectinload(FormaPagoModel.forma_pago_sri))
            .where(
                FormaPagoModel.empresa_id == empresa_id,
                FormaPagoModel.punto_emision_id == punto_emision_id,
                FormaPagoModel.activo.is_(True),
                FormaPagoModel.aplica_venta.is_(True),
            )
            .order_by(FormaPagoModel.nombre)
        )
        return [
            FormaPago(
                id=modelo.id,
                empresa_id=modelo.empresa_id,
                punto_emision_id=modelo.punto_emision_id,
                codigo=modelo.codigo,
                nombre=modelo.nombre,
                forma_pago_sri_id=modelo.forma_pago_sri_id,
                forma_pago_sri_codigo=modelo.forma_pago_sri.codigo if modelo.forma_pago_sri else None,
                forma_pago_sri_nombre=modelo.forma_pago_sri.nombre if modelo.forma_pago_sri else None,
                aplica_venta=modelo.aplica_venta,
                aplica_compra=modelo.aplica_compra,
                activo=modelo.activo,
            )
            for modelo in resultado.scalars().all()
        ]

    async def listar_formas_pago_sri(self) -> list[FormaPagoSri]:
        resultado = await self.session.execute(select(FormaPagoSriModel).order_by(FormaPagoSriModel.codigo))
        return [
            FormaPagoSri(id=row.id, codigo=row.codigo, nombre=row.nombre, activo=row.activo)
            for row in resultado.scalars().all()
        ]

    async def obtener_empresa(self, empresa_id: int) -> EmpresaModel | None:
        return await self.session.get(EmpresaModel, empresa_id)

    async def obtener_punto(self, punto_id: int) -> PuntoEmisionModel | None:
        return await self.session.get(PuntoEmisionModel, punto_id)

    async def listar_pendientes_reintento(self) -> list[tuple[int, int, int]]:
        resultado = await self.session.execute(
            select(FacturaModel.id, FacturaModel.empresa_id, FacturaModel.punto_emision_id).where(
                or_(
                    FacturaModel.estado == EstadoFactura.PENDIENTE_AUTORIZACION,
                    FacturaModel.estado == EstadoFactura.RECHAZADA,
                )
            )
        )
        return [(row[0], row[1], row[2]) for row in resultado.all()]
