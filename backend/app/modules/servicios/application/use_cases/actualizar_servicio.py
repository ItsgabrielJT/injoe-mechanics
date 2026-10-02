from decimal import Decimal

from app.modules.servicios.application.dto import ActualizarServicioCommand, ContextoTenant
from app.modules.servicios.application.ports.repositorios import ServicioRepository
from app.modules.servicios.domain.entities import (
    Servicio,
    codigo_valido,
    descripcion_valida,
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
    ServicioNoEncontrado,
)


class ActualizarServicioUseCase:
    def __init__(self, servicio_repository: ServicioRepository) -> None:
        self.servicio_repository = servicio_repository

    async def execute(self, command: ActualizarServicioCommand, tenant: ContextoTenant) -> Servicio:
        servicio = await self.servicio_repository.obtener_por_id(
            command.servicio_id,
            tenant.empresa_id,
            tenant.punto_emision_id,
        )
        if servicio is None:
            raise ServicioNoEncontrado()

        if command.nombre is not None:
            nombre = command.nombre.strip()
            if not nombre_valido(nombre):
                raise NombreRequerido()
            servicio.nombre = nombre

        if command.precio_venta is not None:
            precio = Decimal(command.precio_venta)
            if not precio_valido(precio):
                raise PrecioInvalido()
            servicio.precio_venta = precio

        if command.tipo_impuesto is not None:
            servicio.tipo_impuesto = command.tipo_impuesto

        if command.codigo is not None:
            codigo = command.codigo.strip().upper()
            if not codigo_valido(codigo):
                raise CodigoInvalido()
            duplicado = await self.servicio_repository.obtener_por_codigo(
                codigo,
                tenant.empresa_id,
                tenant.punto_emision_id,
            )
            if duplicado and duplicado.id != servicio.id:
                raise CodigoDuplicado()
            servicio.codigo = codigo

        if command.descripcion is not None:
            descripcion = command.descripcion.strip() or None
            if not descripcion_valida(descripcion):
                raise DescripcionExcedida()
            servicio.descripcion = descripcion

        if command.categoria is not None:
            servicio.categoria = command.categoria
        if command.aplica_iva is not None:
            servicio.aplica_iva = command.aplica_iva
        if command.peso is not None:
            if not peso_valido(command.peso):
                raise PesoInvalido()
            servicio.peso = command.peso
        if command.activo is not None:
            servicio.activo = command.activo

        return await self.servicio_repository.guardar(servicio)
