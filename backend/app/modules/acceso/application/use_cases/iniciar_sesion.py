from app.core.config import settings
from app.core.security import crear_access_token, crear_refresh_token, verificar_contrasena
from app.modules.acceso.application.dto import IniciarSesionCommand, ResultadoSesion
from app.modules.identidad.application.ports.repositorios import AccesoRepository, UsuarioRepository
from app.shared.domain.exceptions import CredencialesInvalidas, SinPuntosEmision, UsuarioInactivo


class IniciarSesionUseCase:
    def __init__(
        self,
        usuario_repository: UsuarioRepository,
        acceso_repository: AccesoRepository,
    ) -> None:
        self.usuario_repository = usuario_repository
        self.acceso_repository = acceso_repository

    async def execute(self, command: IniciarSesionCommand) -> ResultadoSesion:
        usuario = await self.usuario_repository.buscar_por_identificador(command.identificador)
        if usuario is None or not verificar_contrasena(command.contrasena, usuario.contrasena_hash):
            raise CredencialesInvalidas()
        if not usuario.activo:
            raise UsuarioInactivo()

        accesos = await self.acceso_repository.listar_accesos(usuario.id)
        puntos = [punto for acceso in accesos for punto in acceso.puntos_emision]
        if not puntos:
            raise SinPuntosEmision()

        await self.usuario_repository.actualizar_ultimo_acceso(usuario.id)

        empresa_id = None
        punto_emision_id = None
        requiere_seleccion = True
        if len(puntos) == 1:
            empresa_id = puntos[0].empresa_id
            punto_emision_id = puntos[0].id
            requiere_seleccion = False

        claims = {
            "sub": str(usuario.id),
            "correo": usuario.correo,
            "roles": usuario.roles,
        }
        if empresa_id is not None and punto_emision_id is not None:
            claims["empresa_id"] = empresa_id
            claims["punto_emision_id"] = punto_emision_id

        return ResultadoSesion(
            access_token=crear_access_token(claims),
            refresh_token=crear_refresh_token(claims),
            expira_en=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            usuario=usuario,
            empresas=accesos,
            empresa_id=empresa_id,
            punto_emision_id=punto_emision_id,
            requiere_seleccion=requiere_seleccion,
        )
