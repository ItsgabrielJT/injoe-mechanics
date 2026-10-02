from typing import Protocol

from app.modules.ordenes_trabajo.application.dto import ListarOrdenesQuery
from app.modules.ordenes_trabajo.domain.entities import OrdenTrabajo, TotalesOrdenes


class OrdenTrabajoRepository(Protocol):
    async def obtener_por_id(self, orden_id: int, empresa_id: int, punto_emision_id: int) -> OrdenTrabajo | None: ...

    async def siguiente_numero(self, empresa_id: int, punto_emision_id: int) -> str: ...

    async def listar(
        self, empresa_id: int, punto_emision_id: int, query: ListarOrdenesQuery
    ) -> tuple[list[OrdenTrabajo], int, TotalesOrdenes]: ...

    async def guardar(self, orden: OrdenTrabajo) -> OrdenTrabajo: ...

    async def eliminar(self, orden_id: int, empresa_id: int, punto_emision_id: int) -> bool: ...
