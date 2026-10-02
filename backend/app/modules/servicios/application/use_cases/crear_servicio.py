from decimal import Decimal

from app.modules.servicios.application.dto import ContextoTenant, CrearServicioCommand
from app.modules.servicios.application.ports.repositorios import ServicioRepository
from app.modules.servicios.domain.entities import (
    INTENTOS_CODIGO,
    Servicio,
    codigo_valido,
    descripcion_valida,
    generar_codigo_servicio,
    nombre_valido,
    peso_valido,
    precio_valido,
)
from app.modules.servicios.domain.exceptions import (
    CodigoDuplicado,
    CodigoInvalido,
    DescripcionExcedida,
    NombreRequerido,
    PesoInvalido,
    PrecioInvalido,
    TipoImpuestoRequerido,
)


class CrearServicioUseCase:
    def __init__(self, servicio_repository: ServicioRepository) -> None:
        self.servicio_repository = servicio_repository

    async def execute(self, command: CrearServicioCommand, tenant: ContextoTenant) -> Servicio:
        nombre = command.nombre.strip()
        if not nombre_valido(nombre):
            raise NombreRequerido()
        if command.tipo_impuesto is None:
            raise TipoImpuestoRequerido()
        if not precio_valido(Decimal(command.precio_venta)):
            raise PrecioInvalido()

        descripcion = command.descripcion.strip() if command.descripcion else None
        if descripcion == "":
            descripcion = None
        if not descripcion_valida(descripcion):
            raise DescripcionExcedida()
        if not peso_valido(command.peso):
            raise PesoInvalido()

        codigo_manual = command.codigo.strip().upper() if command.codigo and command.codigo.strip() else None
        if codigo_manual:
            if not codigo_valido(codigo_manual):
                raise CodigoInvalido()
            duplicado = await self.servicio_repository.obtener_por_codigo(
                codigo_manual,
                tenant.empresa_id,
                tenant.punto_emision_id,
            )
            if duplicado:
                raise CodigoDuplicado()
            return await self._guardar(command, tenant, codigo_manual, nombre, descripcion)

        for _ in range(INTENTOS_CODIGO):
            codigo = generar_codigo_servicio()
            duplicado = await self.servicio_repository.obtener_por_codigo(
                codigo,
                tenant.empresa_id,
                tenant.punto_emision_id,
            )
            if duplicado is None:
                return await self._guardar(command, tenant, codigo, nombre, descripcion)

        raise CodigoDuplicado("No se pudo generar un código único. Inténtalo de nuevo")

    async def _guardar(
        self,
        command: CrearServicioCommand,
        tenant: ContextoTenant,
        codigo: str,
        nombre: str,
        descripcion: str | None,
    ) -> Servicio:
        servicio = Servicio(
            id=None,
            empresa_id=tenant.empresa_id,
            punto_emision_id=tenant.punto_emision_id,
            codigo=codigo,
            nombre=nombre,
            tipo_impuesto=command.tipo_impuesto,
            precio_venta=Decimal(command.precio_venta),
            descripcion=descripcion,
            categoria=command.categoria,
            aplica_iva=command.aplica_iva,
            peso=command.peso,
            activo=command.activo,
        )
        return await self.servicio_repository.guardar(servicio)
