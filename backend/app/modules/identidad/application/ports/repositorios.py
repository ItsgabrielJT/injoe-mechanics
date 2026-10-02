from typing import Protocol

from app.modules.identidad.domain.entities import AccesoEmpresa, PuntoEmision, Usuario


class UsuarioRepository(Protocol):
    async def buscar_por_identificador(self, identificador: str) -> Usuario | None: ...

    async def obtener_por_id(self, usuario_id: int) -> Usuario | None: ...

    async def actualizar_ultimo_acceso(self, usuario_id: int) -> None: ...


class AccesoRepository(Protocol):
    async def listar_accesos(self, usuario_id: int) -> list[AccesoEmpresa]: ...

    async def obtener_punto_autorizado(
        self,
        usuario_id: int,
        punto_emision_id: int,
    ) -> PuntoEmision | None: ...
