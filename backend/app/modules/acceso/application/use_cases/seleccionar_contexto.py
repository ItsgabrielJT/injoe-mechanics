from app.core.config import settings
from app.core.security import crear_access_token, crear_refresh_token
from app.modules.acceso.application.dto import ResultadoSesion, SeleccionarContextoCommand
from app.modules.identidad.application.ports.repositorios import AccesoRepository, UsuarioRepository
from app.shared.domain.exceptions import PuntoNoAutorizado, UsuarioInactivo


class SeleccionarContextoUseCase:
    def __init__(
        self,
        usuario_repository: UsuarioRepository,
        acceso_repository: AccesoRepository,
    ) -> None:
        self.usuario_repository = usuario_repository
        self.acceso_repository = acceso_repository

    async def execute(self, command: SeleccionarContextoCommand) -> ResultadoSesion:
        usuario = await self.usuario_repository.obtener_por_id(command.usuario_id)
        if usuario is None or not usuario.activo:
            raise UsuarioInactivo()

        punto = await self.acceso_repository.obtener_punto_autorizado(
            command.usuario_id,
            command.punto_emision_id,
        )
        if punto is None:
            raise PuntoNoAutorizado()

        accesos = await self.acceso_repository.listar_accesos(usuario.id)
        claims = {
            "sub": str(usuario.id),
            "correo": usuario.correo,
            "roles": usuario.roles,
            "empresa_id": punto.empresa_id,
            "punto_emision_id": punto.id,
        }
        return ResultadoSesion(
            access_token=crear_access_token(claims),
            refresh_token=crear_refresh_token(claims),
            expira_en=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            usuario=usuario,
            empresas=accesos,
            empresa_id=punto.empresa_id,
            punto_emision_id=punto.id,
            requiere_seleccion=False,
        )
