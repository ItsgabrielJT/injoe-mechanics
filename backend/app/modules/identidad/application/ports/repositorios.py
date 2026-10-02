from typing import Protocol

from app.modules.identidad.domain.entities import AccesoEmpresa, PuntoEmision, Usuario


class UsuarioRepository(Protocol):
    async def buscar_por_identificador(self, identificador: str) -> Usuario | None: ...

    async def obtener_por_id(self, usuario_id: int) -> Usuario | None: ...

    async def actualizar_ultimo_acceso(self, usuario_id: int) -> None: ...

    async def listar_por_punto(self, empresa_id: int, punto_emision_id: int) -> list[Usuario]: ...

    async def tiene_punto(self, usuario_id: int, punto_emision_id: int) -> bool: ...


class AccesoRepository(Protocol):
    async def listar_accesos(self, usuario_id: int) -> list[AccesoEmpresa]: ...

    async def obtener_punto_autorizado(
        self,
        usuario_id: int,
        punto_emision_id: int,
    ) -> PuntoEmision | None: ...
