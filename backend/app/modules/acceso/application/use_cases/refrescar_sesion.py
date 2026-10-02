from app.core.config import settings
from app.core.security import crear_access_token, crear_refresh_token, decodificar_token
from app.modules.acceso.application.dto import ResultadoSesion
from app.modules.identidad.application.ports.repositorios import AccesoRepository, UsuarioRepository
from app.shared.domain.exceptions import TokenInvalido, UsuarioInactivo


class RefrescarSesionUseCase:
    def __init__(
        self,
        usuario_repository: UsuarioRepository,
        acceso_repository: AccesoRepository,
    ) -> None:
        self.usuario_repository = usuario_repository
        self.acceso_repository = acceso_repository

    async def execute(self, refresh_token: str) -> ResultadoSesion:
        payload = decodificar_token(refresh_token)
        if payload is None or payload.get("type") != "refresh" or not payload.get("sub"):
            raise TokenInvalido()

        usuario = await self.usuario_repository.obtener_por_id(int(payload["sub"]))
        if usuario is None or not usuario.activo:
            raise UsuarioInactivo()

        accesos = await self.acceso_repository.listar_accesos(usuario.id)
        empresa_id = payload.get("empresa_id")
        punto_emision_id = payload.get("punto_emision_id")
        if punto_emision_id is not None:
            punto = await self.acceso_repository.obtener_punto_autorizado(usuario.id, int(punto_emision_id))
            if punto is None:
                empresa_id = None
                punto_emision_id = None
            else:
                empresa_id = punto.empresa_id
                punto_emision_id = punto.id

        claims = {
            "sub": str(usuario.id),
            "correo": usuario.correo,
            "roles": usuario.roles,
        }
        if empresa_id is not None and punto_emision_id is not None:
            claims["empresa_id"] = int(empresa_id)
            claims["punto_emision_id"] = int(punto_emision_id)

        return ResultadoSesion(
            access_token=crear_access_token(claims),
            refresh_token=crear_refresh_token(claims),
            expira_en=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            usuario=usuario,
            empresas=accesos,
            empresa_id=int(empresa_id) if empresa_id is not None else None,
            punto_emision_id=int(punto_emision_id) if punto_emision_id is not None else None,
            requiere_seleccion=punto_emision_id is None,
        )
