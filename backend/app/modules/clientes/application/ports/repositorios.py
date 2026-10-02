from typing import Protocol

from app.modules.clientes.application.dto import ListarClientesQuery, ListarVehiculosQuery
from app.modules.clientes.domain.entities import Cliente, Vehiculo


class ClienteRepository(Protocol):
    async def obtener_por_id(
        self,
        cliente_id: int,
        empresa_id: int,
        punto_emision_id: int,
    ) -> Cliente | None: ...

    async def obtener_por_identificacion(
        self,
        identificacion: str,
        empresa_id: int,
        punto_emision_id: int,
    ) -> Cliente | None: ...

    async def listar(
        self,
        empresa_id: int,
        punto_emision_id: int,
        query: ListarClientesQuery,
    ) -> tuple[list[Cliente], int]: ...

    async def guardar(self, cliente: Cliente) -> Cliente: ...

    async def eliminar(
        self,
        cliente_id: int,
        empresa_id: int,
        punto_emision_id: int,
    ) -> bool: ...


class VehiculoRepository(Protocol):
    async def obtener_por_id(
        self,
        vehiculo_id: int,
        empresa_id: int,
        punto_emision_id: int,
    ) -> Vehiculo | None: ...

    async def obtener_por_placa(
        self,
        placa: str,
        empresa_id: int,
        punto_emision_id: int,
    ) -> Vehiculo | None: ...

    async def listar(
        self,
        empresa_id: int,
        punto_emision_id: int,
        query: ListarVehiculosQuery,
    ) -> tuple[list[Vehiculo], int]: ...

    async def listar_por_cliente(
        self,
        cliente_id: int,
        empresa_id: int,
        punto_emision_id: int,
    ) -> list[Vehiculo]: ...

    async def guardar(self, vehiculo: Vehiculo) -> Vehiculo: ...

    async def eliminar(
        self,
        vehiculo_id: int,
        empresa_id: int,
        punto_emision_id: int,
    ) -> bool: ...
