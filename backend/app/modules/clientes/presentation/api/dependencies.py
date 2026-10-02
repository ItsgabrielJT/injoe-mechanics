from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.modules.acceso.presentation.api.dependencies import get_payload_autenticado
from app.modules.clientes.application.dto import ContextoTenant
from app.modules.clientes.application.use_cases.actualizar_cliente import ActualizarClienteUseCase
from app.modules.clientes.application.use_cases.actualizar_vehiculo import ActualizarVehiculoUseCase
from app.modules.clientes.application.use_cases.crear_cliente import CrearClienteUseCase
from app.modules.clientes.application.use_cases.crear_vehiculo import CrearVehiculoUseCase
from app.modules.clientes.application.use_cases.eliminar_cliente import EliminarClienteUseCase
from app.modules.clientes.application.use_cases.eliminar_vehiculo import EliminarVehiculoUseCase
from app.modules.clientes.application.use_cases.listar_clientes import ListarClientesUseCase
from app.modules.clientes.application.use_cases.listar_vehiculos import ListarVehiculosClienteUseCase, ListarVehiculosUseCase
from app.modules.clientes.application.use_cases.obtener_cliente import ObtenerClienteUseCase
from app.modules.clientes.application.use_cases.obtener_vehiculo import ObtenerVehiculoUseCase
from app.modules.clientes.infrastructure.persistence.repositories import (
    SqlAlchemyClienteRepository,
    SqlAlchemyVehiculoRepository,
)
from app.shared.domain.exceptions import SesionSinContexto


def get_tenant(payload: Annotated[dict, Depends(get_payload_autenticado)]) -> ContextoTenant:
    empresa_id = payload.get("empresa_id")
    punto_emision_id = payload.get("punto_emision_id")
    if empresa_id is None or punto_emision_id is None:
        raise SesionSinContexto()
    return ContextoTenant(empresa_id=int(empresa_id), punto_emision_id=int(punto_emision_id))


async def get_cliente_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SqlAlchemyClienteRepository:
    return SqlAlchemyClienteRepository(session)


async def get_vehiculo_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SqlAlchemyVehiculoRepository:
    return SqlAlchemyVehiculoRepository(session)


async def get_crear_cliente_use_case(
    repository: Annotated[SqlAlchemyClienteRepository, Depends(get_cliente_repository)],
) -> CrearClienteUseCase:
    return CrearClienteUseCase(repository)


async def get_actualizar_cliente_use_case(
    repository: Annotated[SqlAlchemyClienteRepository, Depends(get_cliente_repository)],
) -> ActualizarClienteUseCase:
    return ActualizarClienteUseCase(repository)


async def get_obtener_cliente_use_case(
    repository: Annotated[SqlAlchemyClienteRepository, Depends(get_cliente_repository)],
) -> ObtenerClienteUseCase:
    return ObtenerClienteUseCase(repository)


async def get_listar_clientes_use_case(
    repository: Annotated[SqlAlchemyClienteRepository, Depends(get_cliente_repository)],
) -> ListarClientesUseCase:
    return ListarClientesUseCase(repository)


async def get_eliminar_cliente_use_case(
    repository: Annotated[SqlAlchemyClienteRepository, Depends(get_cliente_repository)],
) -> EliminarClienteUseCase:
    return EliminarClienteUseCase(repository)


async def get_crear_vehiculo_use_case(
    vehiculo_repository: Annotated[SqlAlchemyVehiculoRepository, Depends(get_vehiculo_repository)],
    cliente_repository: Annotated[SqlAlchemyClienteRepository, Depends(get_cliente_repository)],
) -> CrearVehiculoUseCase:
    return CrearVehiculoUseCase(vehiculo_repository, cliente_repository)


async def get_actualizar_vehiculo_use_case(
    repository: Annotated[SqlAlchemyVehiculoRepository, Depends(get_vehiculo_repository)],
) -> ActualizarVehiculoUseCase:
    return ActualizarVehiculoUseCase(repository)


async def get_obtener_vehiculo_use_case(
    repository: Annotated[SqlAlchemyVehiculoRepository, Depends(get_vehiculo_repository)],
) -> ObtenerVehiculoUseCase:
    return ObtenerVehiculoUseCase(repository)


async def get_listar_vehiculos_use_case(
    repository: Annotated[SqlAlchemyVehiculoRepository, Depends(get_vehiculo_repository)],
) -> ListarVehiculosUseCase:
    return ListarVehiculosUseCase(repository)


async def get_listar_vehiculos_cliente_use_case(
    repository: Annotated[SqlAlchemyVehiculoRepository, Depends(get_vehiculo_repository)],
) -> ListarVehiculosClienteUseCase:
    return ListarVehiculosClienteUseCase(repository)


async def get_eliminar_vehiculo_use_case(
    repository: Annotated[SqlAlchemyVehiculoRepository, Depends(get_vehiculo_repository)],
) -> EliminarVehiculoUseCase:
    return EliminarVehiculoUseCase(repository)
