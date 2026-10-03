from sqlalchemy.exc import IntegrityError

from app.modules.configuracion.application.dto import ContextoTenant, GuardarPuntoCommand
from app.modules.configuracion.application.ports.repositorios import PuntoConfigRepository
from app.modules.configuracion.domain.entities import PuntoEmisionConfig
from app.modules.configuracion.domain.exceptions import PuntoDuplicado, PuntoEnUso, PuntoNoEncontrado


class ListarPuntosUseCase:
    def __init__(self, repository: PuntoConfigRepository) -> None:
        self.repository = repository

    async def execute(self, empresa_id: int) -> list[PuntoEmisionConfig]:
        return await self.repository.listar(empresa_id)


class GuardarPuntoUseCase:
    def __init__(self, repository: PuntoConfigRepository) -> None:
        self.repository = repository

    async def execute(self, command: GuardarPuntoCommand, tenant: ContextoTenant) -> PuntoEmisionConfig:
        codigo = command.codigo.strip().zfill(3) if command.codigo.strip().isdigit() else command.codigo.strip()
        punto_emision = (
            command.punto_emision.strip().zfill(3)
            if command.punto_emision.strip().isdigit()
            else command.punto_emision.strip()
        )
        existente = await self.repository.obtener_por_codigo(tenant.empresa_id, codigo, punto_emision)
        if existente and existente.id != command.punto_id:
            raise PuntoDuplicado()

        if command.punto_id:
            punto = await self.repository.obtener(command.punto_id, tenant.empresa_id)
            if punto is None:
                raise PuntoNoEncontrado()
        else:
            punto = PuntoEmisionConfig(
                id=None,
                empresa_id=tenant.empresa_id,
                punto_emision=punto_emision,
                codigo=codigo,
                direccion=command.direccion,
                info=command.info,
                factura_seq=command.factura_seq,
                nota_credito_seq=command.nota_credito_seq,
                nota_debito_seq=command.nota_debito_seq,
                retencion_seq=command.retencion_seq,
                liquidacion_compra_seq=command.liquidacion_compra_seq,
                guia_remision_seq=command.guia_remision_seq,
            )

        punto.punto_emision = punto_emision
        punto.codigo = codigo
        punto.direccion = command.direccion.strip()
        punto.info = command.info.strip() if command.info else None
        punto.factura_seq = max(0, command.factura_seq)
        punto.nota_credito_seq = max(0, command.nota_credito_seq)
        punto.nota_debito_seq = max(0, command.nota_debito_seq)
        punto.retencion_seq = max(0, command.retencion_seq)
        punto.liquidacion_compra_seq = max(0, command.liquidacion_compra_seq)
        punto.guia_remision_seq = max(0, command.guia_remision_seq)
        guardado = await self.repository.guardar(punto)
        if command.punto_id is None and guardado.id:
            await self.repository.sembrar_formas_pago(tenant.empresa_id, guardado.id)
            await self.repository.asignar_usuario(tenant.usuario_id, guardado.id)
        return guardado


class EliminarPuntoUseCase:
    def __init__(self, repository: PuntoConfigRepository) -> None:
        self.repository = repository

    async def execute(self, punto_id: int, empresa_id: int) -> None:
        punto = await self.repository.obtener(punto_id, empresa_id)
        if punto is None:
            raise PuntoNoEncontrado()
        try:
            await self.repository.eliminar(punto_id, empresa_id)
        except IntegrityError as exc:
            raise PuntoEnUso() from exc
