import json
from datetime import date

from app.modules.facturacion.application.dto import (
    ContextoTenant,
    CrearDesdeOrdenCommand,
    GuardarFacturaCommand,
    ItemFacturaCommand,
    ListarFacturasQuery,
)
from app.modules.facturacion.domain.entities import (
    EstadoFactura,
    Factura,
    FacturaItem,
    TipoReceptor,
    precio_base,
)
from app.modules.facturacion.domain.exceptions import (
    CertificadoNoConfigurado,
    FacturaNoEditable,
    FacturaNoEncontrada,
    FacturaSinItems,
    OrdenNoFacturable,
    OrdenYaFacturada,
    ReceptorInvalido,
)
from app.modules.facturacion.infrastructure.persistence.repositories import SqlAlchemyFacturaRepository
from app.modules.facturacion.infrastructure.pdf_email import enviar_correo_factura, generar_pdf_factura
from app.modules.facturacion.infrastructure.sri_client import consultar_autorizacion, firmar_factura, resumen_error
from app.modules.ordenes_trabajo.domain.entities import EstadoOrden
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


class ListarFacturasUseCase:
    def __init__(self, repository: SqlAlchemyFacturaRepository) -> None:
        self.repository = repository

    async def execute(self, query: ListarFacturasQuery, tenant: ContextoTenant) -> tuple[list[Factura], int]:
        return await self.repository.listar(tenant.empresa_id, tenant.punto_emision_id, query)


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
            if factura.estado != EstadoFactura.BORRADOR:
                raise FacturaNoEditable()
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
    def __init__(self, repository: SqlAlchemyFacturaRepository) -> None:
        self.repository = repository

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
        factura.estado = EstadoFactura.ENVIADA
        await self.repository.guardar(factura)
        respuesta = await firmar_factura(factura, empresa, punto)
        return await _aplicar_respuesta_sri(self.repository, factura, empresa, punto, respuesta)


async def _aplicar_respuesta_sri(repository, factura: Factura, empresa, punto, respuesta: dict) -> Factura:
    result = respuesta.get("result") or {}
    status = respuesta.get("status") or result.get("status")
    access_key = respuesta.get("accessKey") or result.get("accessKey")
    xml = result.get("xmlFileSigned")
    if access_key:
        factura.clave_acceso = access_key
    if xml:
        factura.xml_content = xml
    if result.get("isAuthorized") or status == "authorized":
        factura.estado = EstadoFactura.AUTORIZADA
        factura.fecha_autorizacion = factura.fecha_autorizacion or __import__("datetime").datetime.now()
        factura.reason_error = None
        factura.numero_autorizacion = access_key
        guardada = await repository.guardar(factura)
        if guardada.tipo_receptor == TipoReceptor.CLIENTE and guardada.cliente_correo:
            try:
                pdf = generar_pdf_factura(guardada, empresa, punto)
                enviar_correo_factura(guardada, guardada.xml_content, pdf)
            except Exception:
                pass
        return guardada
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
    def __init__(self, repository: SqlAlchemyFacturaRepository) -> None:
        self.repository = repository

    async def execute(self, factura_id: int, empresa_id: int, punto_emision_id: int) -> Factura | None:
        factura = await self.repository.obtener(factura_id, empresa_id, punto_emision_id)
        if factura is None:
            return None
        reintentable = "network" in (factura.reason_error or "") or "pendiente" in (factura.reason_error or "").lower()
        if factura.estado == EstadoFactura.RECHAZADA and not reintentable and "retryable" not in (factura.reason_error or ""):
            if "sri_reception_network" not in (factura.reason_error or "") and "sri_authorization_pending" not in (factura.reason_error or ""):
                return factura
        empresa = await self.repository.obtener_empresa(empresa_id)
        punto = await self.repository.obtener_punto(punto_emision_id)
        if empresa is None or punto is None:
            return factura
        if factura.clave_acceso and factura.estado in {EstadoFactura.PENDIENTE_AUTORIZACION, EstadoFactura.RECHAZADA}:
            consulta = await consultar_autorizacion(factura.clave_acceso)
            result = consulta.get("result") or consulta
            if result.get("isAuthorized") and result.get("xmlAuthorized"):
                factura.estado = EstadoFactura.AUTORIZADA
                factura.xml_content = result.get("xmlAuthorized")
                factura.fecha_autorizacion = __import__("datetime").datetime.now()
                factura.reason_error = None
                guardada = await self.repository.guardar(factura)
                if guardada.tipo_receptor == TipoReceptor.CLIENTE and guardada.cliente_correo:
                    try:
                        pdf = generar_pdf_factura(guardada, empresa, punto)
                        enviar_correo_factura(guardada, guardada.xml_content, pdf)
                    except Exception:
                        pass
                return guardada
        if factura.estado == EstadoFactura.RECHAZADA:
            respuesta = await firmar_factura(factura, empresa, punto)
            return await _aplicar_respuesta_sri(self.repository, factura, empresa, punto, respuesta)
        return factura
