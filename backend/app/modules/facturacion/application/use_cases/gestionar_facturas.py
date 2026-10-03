import json
from collections import defaultdict
from datetime import date, datetime
from decimal import Decimal

from app.modules.facturacion.application.dto import (
    ContextoTenant,
    CrearDesdeOrdenCommand,
    EstadisticasFactura,
    GuardarFacturaCommand,
    ItemFacturaCommand,
    ListarFacturasQuery,
    TotalesFactura,
)
from app.modules.facturacion.domain.entities import (
    EstadoFactura,
    Factura,
    FacturaItem,
    TipoReceptor,
    dinero,
    precio_base,
)
from app.modules.facturacion.domain.exceptions import (
    CertificadoNoConfigurado,
    FacturaNoCancelable,
    FacturaNoEditable,
    FacturaNoEncontrada,
    FacturaSinItems,
    FacturaYaCancelada,
    OrdenNoFacturable,
    OrdenYaFacturada,
    ReceptorInvalido,
)
from app.modules.facturacion.infrastructure.persistence.repositories import SqlAlchemyFacturaRepository
from app.modules.facturacion.infrastructure.pdf_email import enviar_correo_factura, generar_pdf_factura
from app.modules.facturacion.infrastructure.sri_client import (
    consultar_autorizacion,
    es_secuencial_registrado,
    firmar_factura,
    recuperar_secuencial,
    resumen_error,
)
from app.modules.inventario.domain.entities import (
    INTENTOS_CODIGO,
    LineaMovimiento,
    MovimientoInventario,
    TipoMovimiento,
    generar_codigo_lote,
)
from app.modules.inventario.infrastructure.persistence.repositories import (
    SqlAlchemyMovimientoRepository,
    SqlAlchemyProductoRepository,
)
from app.modules.ordenes_trabajo.domain.entities import EstadoOrden
from app.modules.ordenes_trabajo.domain.exceptions import BodegaRequerida
from app.modules.ordenes_trabajo.infrastructure.persistence.repositories import SqlAlchemyOrdenTrabajoRepository


def _items_desde_comando(items: list[ItemFacturaCommand]) -> list[FacturaItem]:
    resultado = []
    for item in items:
        if not item.producto_id and not item.servicio_id:
            continue
        linea = FacturaItem(
            id=None,
            producto_id=item.producto_id,
            servicio_id=item.servicio_id,
            descripcion=item.descripcion.strip(),
            codigo=item.codigo,
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            descuento_porcentaje=item.descuento_porcentaje or 0,
            aplica_iva=item.aplica_iva,
            tipo_impuesto=item.tipo_impuesto,
            bodega_id=item.bodega_id,
        )
        linea.recalcular()
        resultado.append(linea)
    return resultado


def _validar_receptor(tipo: TipoReceptor, cliente_id: int | None) -> None:
    if tipo == TipoReceptor.CLIENTE and not cliente_id:
        raise ReceptorInvalido("Seleccione un cliente para facturar")
    if tipo == TipoReceptor.CONSUMIDOR_FINAL:
        return


def _nombre_cliente(factura: Factura) -> str:
    if factura.tipo_receptor == TipoReceptor.CONSUMIDOR_FINAL:
        return "CONSUMIDOR FINAL"
    return factura.cliente_nombres or "Cliente"


def _nota_salida_factura(factura: Factura) -> str:
    fecha = ""
    if factura.fecha_autorizacion:
        fecha = factura.fecha_autorizacion.strftime("%Y-%m-%d")
    elif factura.fecha_emision:
        fecha = factura.fecha_emision.isoformat()
    return (
        f"Factura: {factura.numero}, Cliente: {_nombre_cliente(factura)}, "
        f"Total: ${dinero(factura.total)}, Fecha autorización: {fecha}"
    )


async def _codigo_lote(movimiento_repository: SqlAlchemyMovimientoRepository, tenant: ContextoTenant) -> str:
    for _ in range(INTENTOS_CODIGO):
        codigo = generar_codigo_lote()
        existente = await movimiento_repository.obtener_por_codigo(codigo, tenant.empresa_id, tenant.punto_emision_id)
        if existente is None:
            return codigo
    raise FacturaNoEditable("No se pudo generar el lote de inventario")


async def _lineas_salida_factura(
    factura: Factura,
    producto_repository: SqlAlchemyProductoRepository,
    tenant: ContextoTenant,
) -> dict[int, list[LineaMovimiento]]:
    por_bodega: dict[int, dict[int, LineaMovimiento]] = defaultdict(dict)
    for item in factura.items:
        if not item.producto_id:
            continue
        producto = await producto_repository.obtener_por_id(item.producto_id, tenant.empresa_id, tenant.punto_emision_id)
        if producto is None or not producto.aplica_inventario:
            continue
        if not item.bodega_id:
            raise BodegaRequerida(f"{item.descripcion} requiere bodega para descontar stock")
        actual = por_bodega[item.bodega_id].get(item.producto_id)
        if actual:
            actual.cantidad += Decimal(item.cantidad)
            continue
        por_bodega[item.bodega_id][item.producto_id] = LineaMovimiento(
            producto_id=item.producto_id,
            cantidad=Decimal(item.cantidad),
            stock_origen_despues=Decimal("0"),
            producto_codigo=item.codigo,
            producto_nombre=item.descripcion,
        )
    return {bodega_id: list(lineas.values()) for bodega_id, lineas in por_bodega.items()}


async def _registrar_salida_factura(
    factura: Factura,
    producto_repository: SqlAlchemyProductoRepository,
    movimiento_repository: SqlAlchemyMovimientoRepository,
    tenant: ContextoTenant,
) -> None:
    if factura.orden_trabajo_id or factura.estado != EstadoFactura.AUTORIZADA:
        return
    nota = _nota_salida_factura(factura)
    if await movimiento_repository.existe_por_nota(f"Factura: {factura.numero},", tenant.empresa_id, tenant.punto_emision_id):
        return
    por_bodega = await _lineas_salida_factura(factura, producto_repository, tenant)
    for bodega_id, lineas in por_bodega.items():
        await movimiento_repository.registrar(
            MovimientoInventario(
                id=None,
                empresa_id=tenant.empresa_id,
                punto_emision_id=tenant.punto_emision_id,
                codigo=await _codigo_lote(movimiento_repository, tenant),
                tipo=TipoMovimiento.SALIDA,
                bodega_id=bodega_id,
                nota=nota,
                lineas=lineas,
            )
        )


async def _revertir_salida_factura(
    factura: Factura,
    movimiento_repository: SqlAlchemyMovimientoRepository,
    tenant: ContextoTenant,
) -> None:
    if factura.orden_trabajo_id:
        return
    nota_reverso = f"Reverso por cancelación de factura {factura.numero}"
    if await movimiento_repository.existe_por_nota(nota_reverso, tenant.empresa_id, tenant.punto_emision_id):
        return
    movimientos = await movimiento_repository.listar_por_nota_prefijo(
        f"Factura: {factura.numero},", tenant.empresa_id, tenant.punto_emision_id
    )
    for movimiento in movimientos:
        if movimiento.tipo != TipoMovimiento.SALIDA or not movimiento.lineas:
            continue
        await movimiento_repository.registrar(
            MovimientoInventario(
                id=None,
                empresa_id=tenant.empresa_id,
                punto_emision_id=tenant.punto_emision_id,
                codigo=await _codigo_lote(movimiento_repository, tenant),
                tipo=TipoMovimiento.INGRESO,
                bodega_id=movimiento.bodega_id,
                nota=nota_reverso,
                lineas=[
                    LineaMovimiento(
                        producto_id=linea.producto_id,
                        cantidad=linea.cantidad,
                        stock_origen_despues=Decimal("0"),
                        producto_codigo=linea.producto_codigo,
                        producto_nombre=linea.producto_nombre,
                    )
                    for linea in movimiento.lineas
                ],
            )
        )


class ListarFacturasUseCase:
    def __init__(self, repository: SqlAlchemyFacturaRepository) -> None:
        self.repository = repository

    async def execute(self, query: ListarFacturasQuery, tenant: ContextoTenant) -> tuple[list[Factura], int]:
        return await self.repository.listar(tenant.empresa_id, tenant.punto_emision_id, query)

    async def totales(self, query: ListarFacturasQuery, tenant: ContextoTenant) -> TotalesFactura:
        return await self.repository.totales(tenant.empresa_id, tenant.punto_emision_id, query)


class EstadisticasFacturaUseCase:
    def __init__(self, repository: SqlAlchemyFacturaRepository) -> None:
        self.repository = repository

    async def execute(self, query: ListarFacturasQuery, tenant: ContextoTenant) -> EstadisticasFactura:
        return await self.repository.estadisticas(tenant.empresa_id, tenant.punto_emision_id, query)


class ObtenerFacturaUseCase:
    def __init__(self, repository: SqlAlchemyFacturaRepository) -> None:
        self.repository = repository

    async def execute(self, factura_id: int, tenant: ContextoTenant) -> Factura:
        factura = await self.repository.obtener(factura_id, tenant.empresa_id, tenant.punto_emision_id)
        if factura is None:
            raise FacturaNoEncontrada()
        return factura


class GuardarFacturaUseCase:
    def __init__(self, repository: SqlAlchemyFacturaRepository) -> None:
        self.repository = repository

    async def execute(self, command: GuardarFacturaCommand, tenant: ContextoTenant) -> Factura:
        _validar_receptor(command.tipo_receptor, command.cliente_id)
        items = _items_desde_comando(command.items)
        if not items:
            raise FacturaSinItems()

        if command.factura_id:
            factura = await self.repository.obtener(command.factura_id, tenant.empresa_id, tenant.punto_emision_id)
            if factura is None:
                raise FacturaNoEncontrada()
            if factura.estado not in {EstadoFactura.BORRADOR, EstadoFactura.RECHAZADA}:
                raise FacturaNoEditable("Solo se pueden editar facturas en borrador o rechazadas")
            if factura.estado == EstadoFactura.RECHAZADA:
                factura.estado = EstadoFactura.BORRADOR
                factura.reason_error = None
                factura.numero_autorizacion = None
                factura.fecha_autorizacion = None
        else:
            numero = await self.repository.siguiente_numero(tenant.empresa_id, tenant.punto_emision_id)
            factura = Factura(
                id=None,
                empresa_id=tenant.empresa_id,
                punto_emision_id=tenant.punto_emision_id,
                usuario_id=tenant.usuario_id,
                numero=numero,
                tipo_receptor=command.tipo_receptor,
                estado=EstadoFactura.BORRADOR,
                fecha_emision=command.fecha_emision or date.today(),
            )

        factura.tipo_receptor = command.tipo_receptor
        factura.cliente_id = None if command.tipo_receptor == TipoReceptor.CONSUMIDOR_FINAL else command.cliente_id
        factura.forma_pago_id = command.forma_pago_id
        factura.fecha_emision = command.fecha_emision
        factura.fecha_vencimiento = command.fecha_vencimiento
        factura.fecha_pago = command.fecha_pago
        factura.notas = command.notas
        factura.terminos = command.terminos
        factura.orden_trabajo_id = command.orden_trabajo_id or factura.orden_trabajo_id
        factura.items = items
        factura.recalcular()
        return await self.repository.guardar(factura)


class EliminarFacturaUseCase:
    def __init__(self, repository: SqlAlchemyFacturaRepository) -> None:
        self.repository = repository

    async def execute(self, factura_id: int, tenant: ContextoTenant) -> None:
        factura = await self.repository.obtener(factura_id, tenant.empresa_id, tenant.punto_emision_id)
        if factura is None:
            raise FacturaNoEncontrada()
        if factura.estado != EstadoFactura.BORRADOR:
            raise FacturaNoEditable("Solo se pueden eliminar facturas en borrador")
        await self.repository.eliminar(factura_id, tenant.empresa_id, tenant.punto_emision_id)
        await self.repository.decrementar_secuencial(tenant.empresa_id, tenant.punto_emision_id, factura.numero)


class CrearDesdeOrdenUseCase:
    def __init__(
        self,
        repository: SqlAlchemyFacturaRepository,
        ordenes: SqlAlchemyOrdenTrabajoRepository,
    ) -> None:
        self.repository = repository
        self.ordenes = ordenes

    async def execute(self, command: CrearDesdeOrdenCommand, tenant: ContextoTenant) -> Factura:
        orden = await self.ordenes.obtener_por_id(command.orden_id, tenant.empresa_id, tenant.punto_emision_id)
        if orden is None or orden.estado != EstadoOrden.CERRADA:
            raise OrdenNoFacturable()
        existente = await self.repository.obtener_por_orden(command.orden_id, tenant.empresa_id, tenant.punto_emision_id)
        if existente:
            raise OrdenYaFacturada()
        cliente_id = None if command.tipo_receptor == TipoReceptor.CONSUMIDOR_FINAL else (command.cliente_id or orden.cliente_id)
        _validar_receptor(command.tipo_receptor, cliente_id)
        items = []
        for item in orden.items:
            precio = precio_base(item.precio_venta, item.aplica_iva, item.tipo_impuesto)
            linea = FacturaItem(
                id=None,
                producto_id=item.producto_id,
                servicio_id=item.servicio_id,
                descripcion=item.descripcion,
                codigo=item.codigo,
                cantidad=item.cantidad,
                precio_unitario=precio,
                descuento_porcentaje=0,
                aplica_iva=item.aplica_iva,
                tipo_impuesto=item.tipo_impuesto,
                bodega_id=item.bodega_id,
            )
            linea.recalcular()
            items.append(linea)
        if not items:
            raise FacturaSinItems()
        numero = await self.repository.siguiente_numero(tenant.empresa_id, tenant.punto_emision_id)
        factura = Factura(
            id=None,
            empresa_id=tenant.empresa_id,
            punto_emision_id=tenant.punto_emision_id,
            usuario_id=tenant.usuario_id,
            numero=numero,
            tipo_receptor=command.tipo_receptor,
            estado=EstadoFactura.BORRADOR,
            fecha_emision=date.today(),
            cliente_id=cliente_id,
            orden_trabajo_id=orden.id,
            forma_pago_id=command.forma_pago_id,
            items=items,
        )
        factura.recalcular()
        return await self.repository.guardar(factura)


class EnviarSriUseCase:
    def __init__(
        self,
        repository: SqlAlchemyFacturaRepository,
        producto_repository: SqlAlchemyProductoRepository,
        movimiento_repository: SqlAlchemyMovimientoRepository,
    ) -> None:
        self.repository = repository
        self.producto_repository = producto_repository
        self.movimiento_repository = movimiento_repository

    async def execute(self, factura_id: int, tenant: ContextoTenant) -> Factura:
        factura = await self.repository.obtener(factura_id, tenant.empresa_id, tenant.punto_emision_id)
        if factura is None:
            raise FacturaNoEncontrada()
        if factura.estado not in {
            EstadoFactura.BORRADOR,
            EstadoFactura.ENVIADA,
            EstadoFactura.PENDIENTE_AUTORIZACION,
            EstadoFactura.RECHAZADA,
        }:
            raise FacturaNoEditable("Esta factura no se puede reenviar al SRI")
        empresa = await self.repository.obtener_empresa(tenant.empresa_id)
        punto = await self.repository.obtener_punto(tenant.punto_emision_id)
        if empresa is None or not empresa.sri_id:
            raise CertificadoNoConfigurado()
        if not factura.orden_trabajo_id:
            await _lineas_salida_factura(factura, self.producto_repository, tenant)
        if es_secuencial_registrado(factura.reason_error):
            recuperada = await _aplicar_respuesta_sri(
                self.repository,
                factura,
                empresa,
                punto,
                {
                    "errorCategory": "sri_sequential_registered",
                    "status": "pending_authorization",
                    "accessKey": factura.clave_acceso,
                    "sriMessages": [{"mensaje": "ERROR SECUENCIAL REGISTRADO"}],
                    "result": {},
                },
                tenant,
                self.producto_repository,
                self.movimiento_repository,
            )
            if recuperada.estado == EstadoFactura.AUTORIZADA:
                return recuperada
            factura = recuperada
        factura.estado = EstadoFactura.ENVIADA
        await self.repository.guardar(factura)
        respuesta = await firmar_factura(factura, empresa, punto)
        return await _aplicar_respuesta_sri(
            self.repository, factura, empresa, punto, respuesta, tenant, self.producto_repository, self.movimiento_repository
        )


async def _autorizar_factura(
    repository,
    factura: Factura,
    empresa,
    punto,
    access_key: str | None,
    xml: str | None,
    tenant: ContextoTenant | None,
    producto_repository: SqlAlchemyProductoRepository | None,
    movimiento_repository: SqlAlchemyMovimientoRepository | None,
) -> Factura:
    factura.estado = EstadoFactura.AUTORIZADA
    if access_key:
        factura.clave_acceso = access_key
        factura.numero_autorizacion = access_key
    if xml:
        factura.xml_content = xml
    factura.fecha_autorizacion = factura.fecha_autorizacion or datetime.now()
    factura.reason_error = None
    guardada = await repository.guardar(factura)
    if tenant and producto_repository and movimiento_repository:
        try:
            await _registrar_salida_factura(guardada, producto_repository, movimiento_repository, tenant)
        except Exception:
            pass
    if guardada.tipo_receptor == TipoReceptor.CLIENTE and guardada.cliente_correo:
        try:
            pdf = generar_pdf_factura(guardada, empresa, punto)
            enviar_correo_factura(guardada, guardada.xml_content, pdf, empresa)
        except Exception:
            pass
    return guardada


async def _consultar_claves_autorizadas(*claves: str | None) -> tuple[str | None, str | None]:
    vistas: list[str] = []
    for clave in claves:
        clave_limpia = (clave or "").strip()
        if not clave_limpia or clave_limpia in vistas:
            continue
        vistas.append(clave_limpia)
        consulta = await consultar_autorizacion(clave_limpia)
        result = consulta.get("result") or consulta
        xml = result.get("xmlAuthorized") or result.get("xmlFileSigned")
        if result.get("isAuthorized") and xml:
            return clave_limpia, xml
    return None, None


async def _recuperar_autorizacion_original(factura: Factura, empresa, *claves: str | None) -> tuple[str | None, str | None]:
    if empresa and empresa.sri_id and factura.numero:
        recuperada = await recuperar_secuencial(empresa.sri_id, factura.numero)
        result = recuperada.get("result") or recuperada
        xml = result.get("xmlAuthorized") or result.get("xmlFileSigned")
        clave = result.get("accessKey")
        if result.get("isAuthorized") and xml and clave:
            return clave, xml
    return await _consultar_claves_autorizadas(*claves)


async def _aplicar_respuesta_sri(
    repository,
    factura: Factura,
    empresa,
    punto,
    respuesta: dict,
    tenant: ContextoTenant | None = None,
    producto_repository: SqlAlchemyProductoRepository | None = None,
    movimiento_repository: SqlAlchemyMovimientoRepository | None = None,
) -> Factura:
    result = respuesta.get("result") or {}
    status = respuesta.get("status") or result.get("status")
    access_key = respuesta.get("accessKey") or result.get("accessKey")
    xml = result.get("xmlFileSigned") or result.get("xmlAuthorized")
    clave_previa = factura.clave_acceso
    if result.get("isAuthorized") or status == "authorized":
        return await _autorizar_factura(
            repository, factura, empresa, punto, access_key or clave_previa, xml, tenant, producto_repository, movimiento_repository
        )
    if es_secuencial_registrado(respuesta) or es_secuencial_registrado(factura.reason_error):
        clave_original, xml_original = await _recuperar_autorizacion_original(
            factura, empresa, clave_previa, access_key
        )
        if clave_original and xml_original:
            return await _autorizar_factura(
                repository,
                factura,
                empresa,
                punto,
                clave_original,
                xml_original,
                tenant,
                producto_repository,
                movimiento_repository,
            )
        factura.estado = EstadoFactura.PENDIENTE_AUTORIZACION
        factura.clave_acceso = clave_previa or access_key
        factura.reason_error = json.dumps({
            "errorCategory": "sri_sequential_registered",
            "status": "pending_authorization",
            "message": "El secuencial ya está registrado en el SRI. Se recuperará la autorización original.",
        }, ensure_ascii=False)
        return await repository.guardar(factura)
    if access_key:
        factura.clave_acceso = access_key
    if xml:
        factura.xml_content = xml
    if status == "pending_authorization" or (result and not result.get("isAuthorized") and access_key and status != "rejected"):
        factura.estado = EstadoFactura.PENDIENTE_AUTORIZACION
        factura.reason_error = json.dumps({
            "errorCategory": respuesta.get("errorCategory"),
            "status": status,
            "message": resumen_error(respuesta),
        }, ensure_ascii=False)
        return await repository.guardar(factura)
    factura.estado = EstadoFactura.RECHAZADA
    factura.reason_error = json.dumps({
        "errorCategory": respuesta.get("errorCategory"),
        "status": status,
        "message": resumen_error(respuesta),
    }, ensure_ascii=False)
    return await repository.guardar(factura)


class ReintentarSriUseCase:
    def __init__(
        self,
        repository: SqlAlchemyFacturaRepository,
        producto_repository: SqlAlchemyProductoRepository | None = None,
        movimiento_repository: SqlAlchemyMovimientoRepository | None = None,
    ) -> None:
        self.repository = repository
        self.producto_repository = producto_repository
        self.movimiento_repository = movimiento_repository

    async def execute(self, factura_id: int, empresa_id: int, punto_emision_id: int) -> Factura | None:
        factura = await self.repository.obtener(factura_id, empresa_id, punto_emision_id)
        if factura is None:
            return None
        tenant = ContextoTenant(empresa_id=empresa_id, punto_emision_id=punto_emision_id, usuario_id=factura.usuario_id)
        reason = factura.reason_error or ""
        reintentable = (
            "network" in reason
            or "pendiente" in reason.lower()
            or "retryable" in reason
            or es_secuencial_registrado(reason)
        )
        if factura.estado == EstadoFactura.RECHAZADA and not reintentable:
            if "sri_reception_network" not in reason and "sri_authorization_pending" not in reason:
                return factura
        empresa = await self.repository.obtener_empresa(empresa_id)
        punto = await self.repository.obtener_punto(punto_emision_id)
        if empresa is None or punto is None:
            return factura
        if es_secuencial_registrado(reason) or factura.estado == EstadoFactura.PENDIENTE_AUTORIZACION:
            recuperada = await _aplicar_respuesta_sri(
                self.repository,
                factura,
                empresa,
                punto,
                {
                    "errorCategory": "sri_sequential_registered" if es_secuencial_registrado(reason) else "sri_authorization_pending",
                    "status": "pending_authorization",
                    "accessKey": factura.clave_acceso,
                    "sriMessages": [{"mensaje": "ERROR SECUENCIAL REGISTRADO"}] if es_secuencial_registrado(reason) else [],
                    "result": {},
                },
                tenant,
                self.producto_repository,
                self.movimiento_repository,
            )
            if recuperada.estado == EstadoFactura.AUTORIZADA:
                return recuperada
            factura = recuperada
        if factura.clave_acceso and factura.estado in {EstadoFactura.PENDIENTE_AUTORIZACION, EstadoFactura.RECHAZADA}:
            clave, xml = await _consultar_claves_autorizadas(factura.clave_acceso)
            if clave and xml:
                return await _autorizar_factura(
                    self.repository, factura, empresa, punto, clave, xml, tenant, self.producto_repository, self.movimiento_repository
                )
        if factura.estado == EstadoFactura.RECHAZADA:
            respuesta = await firmar_factura(factura, empresa, punto)
            return await _aplicar_respuesta_sri(
                self.repository, factura, empresa, punto, respuesta, tenant, self.producto_repository, self.movimiento_repository
            )
        return factura


class CancelarFacturaUseCase:
    def __init__(
        self,
        repository: SqlAlchemyFacturaRepository,
        movimiento_repository: SqlAlchemyMovimientoRepository,
    ) -> None:
        self.repository = repository
        self.movimiento_repository = movimiento_repository

    async def execute(self, factura_id: int, tenant: ContextoTenant) -> Factura:
        factura = await self.repository.obtener(factura_id, tenant.empresa_id, tenant.punto_emision_id)
        if factura is None:
            raise FacturaNoEncontrada()
        if factura.estado == EstadoFactura.CANCELADA:
            raise FacturaYaCancelada()
        if factura.estado == EstadoFactura.ENVIADA:
            raise FacturaNoCancelable("Espere la respuesta del SRI antes de cancelar")
        if factura.estado == EstadoFactura.AUTORIZADA:
            await _revertir_salida_factura(factura, self.movimiento_repository, tenant)
        factura.estado = EstadoFactura.CANCELADA
        return await self.repository.guardar(factura)
