from app.modules.acceso.application.dto import ResultadoSesion
from app.modules.identidad.application.ports.repositorios import AccesoRepository, UsuarioRepository
from app.shared.domain.exceptions import UsuarioInactivo


class ObtenerSesionUseCase:
    def __init__(
        self,
        usuario_repository: UsuarioRepository,
        acceso_repository: AccesoRepository,
    ) -> None:
        self.usuario_repository = usuario_repository
        self.acceso_repository = acceso_repository

    async def execute(
        self,
        usuario_id: int,
        empresa_id: int | None,
        punto_emision_id: int | None,
    ) -> ResultadoSesion:
        usuario = await self.usuario_repository.obtener_por_id(usuario_id)
        if usuario is None or not usuario.activo:
            raise UsuarioInactivo()

        accesos = await self.acceso_repository.listar_accesos(usuario.id)
        return ResultadoSesion(
            access_token="",
            refresh_token="",
            expira_en=0,
            usuario=usuario,
            empresas=accesos,
            empresa_id=empresa_id,
            punto_emision_id=punto_emision_id,
            requiere_seleccion=punto_emision_id is None,
        )
