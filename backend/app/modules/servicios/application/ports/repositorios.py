from typing import Protocol

from app.modules.servicios.application.dto import ListarServiciosQuery
from app.modules.servicios.domain.entities import Servicio


class ServicioRepository(Protocol):
    async def obtener_por_id(
        self,
        servicio_id: int,
        empresa_id: int,
        punto_emision_id: int,
    ) -> Servicio | None: ...

    async def obtener_por_codigo(
        self,
        codigo: str,
        empresa_id: int,
        punto_emision_id: int,
    ) -> Servicio | None: ...

    async def listar(
        self,
        empresa_id: int,
        punto_emision_id: int,
        query: ListarServiciosQuery,
    ) -> tuple[list[Servicio], int]: ...

    async def guardar(self, servicio: Servicio) -> Servicio: ...

    async def eliminar(
        self,
        servicio_id: int,
        empresa_id: int,
        punto_emision_id: int,
    ) -> bool: ...
