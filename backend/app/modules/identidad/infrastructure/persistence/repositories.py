from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.identidad.domain.entities import AccesoEmpresa, Empresa, PuntoEmision, Usuario
from app.modules.identidad.infrastructure.persistence.models import (
    EmpresaModel,
    PuntoEmisionModel,
    UsuarioModel,
    UsuarioPuntoEmisionModel,
    UsuarioRolModel,
)


def _usuario_desde_modelo(modelo: UsuarioModel) -> Usuario:
    return Usuario(
        id=modelo.id,
        empresa_id=modelo.empresa_id,
        correo=modelo.correo,
        nombre_usuario=modelo.nombre_usuario,
        nombre_completo=modelo.nombre_completo,
        contrasena_hash=modelo.contrasena_hash,
        activo=modelo.activo,
        verificado=modelo.verificado,
        roles=[enlace.rol.codigo for enlace in modelo.roles if enlace.rol],
        ultimo_acceso=modelo.ultimo_acceso,
    )


def _empresa_desde_modelo(modelo: EmpresaModel) -> Empresa:
    return Empresa(
        id=modelo.id,
        nombre=modelo.nombre,
        slug=modelo.slug,
        ruc=modelo.ruc,
        direccion=modelo.direccion,
        telefono=modelo.telefono,
        correo=modelo.correo,
        activa=modelo.activa,
        verificada=modelo.verificada,
    )


def _punto_desde_modelo(modelo: PuntoEmisionModel) -> PuntoEmision:
    return PuntoEmision(
        id=modelo.id,
        empresa_id=modelo.empresa_id,
        punto_emision=modelo.punto_emision,
        codigo=modelo.codigo,
        direccion=modelo.direccion,
        info=modelo.info,
    )


class SqlAlchemyUsuarioRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def buscar_por_identificador(self, identificador: str) -> Usuario | None:
        valor = identificador.strip()
        consulta = (
            select(UsuarioModel)
            .options(selectinload(UsuarioModel.roles).selectinload(UsuarioRolModel.rol))
            .where(
                or_(
                    func.lower(UsuarioModel.correo) == valor.lower(),
                    func.lower(UsuarioModel.nombre_usuario) == valor.lower(),
                )
            )
        )
        resultado = await self.session.execute(consulta)
        modelo = resultado.scalars().first()
        return _usuario_desde_modelo(modelo) if modelo else None

    async def obtener_por_id(self, usuario_id: int) -> Usuario | None:
        consulta = (
            select(UsuarioModel)
            .options(selectinload(UsuarioModel.roles).selectinload(UsuarioRolModel.rol))
            .where(UsuarioModel.id == usuario_id)
        )
        resultado = await self.session.execute(consulta)
        modelo = resultado.scalars().first()
        return _usuario_desde_modelo(modelo) if modelo else None

    async def actualizar_ultimo_acceso(self, usuario_id: int) -> None:
        modelo = await self.session.get(UsuarioModel, usuario_id)
        if modelo is None:
            return
        modelo.ultimo_acceso = datetime.now(timezone.utc)
        await self.session.commit()

    async def listar_por_punto(self, empresa_id: int, punto_emision_id: int) -> list[Usuario]:
        consulta = (
            select(UsuarioModel)
            .options(selectinload(UsuarioModel.roles).selectinload(UsuarioRolModel.rol))
            .join(UsuarioPuntoEmisionModel, UsuarioPuntoEmisionModel.usuario_id == UsuarioModel.id)
            .where(
                UsuarioModel.empresa_id == empresa_id,
                UsuarioModel.activo.is_(True),
                UsuarioPuntoEmisionModel.punto_emision_id == punto_emision_id,
            )
            .order_by(UsuarioModel.nombre_completo)
        )
        resultado = await self.session.execute(consulta)
        return [_usuario_desde_modelo(modelo) for modelo in resultado.scalars().unique().all()]

    async def tiene_punto(self, usuario_id: int, punto_emision_id: int) -> bool:
        resultado = await self.session.execute(
            select(UsuarioPuntoEmisionModel.id).where(
                UsuarioPuntoEmisionModel.usuario_id == usuario_id,
                UsuarioPuntoEmisionModel.punto_emision_id == punto_emision_id,
            )
        )
        return resultado.scalar_one_or_none() is not None


class SqlAlchemyAccesoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def listar_accesos(self, usuario_id: int) -> list[AccesoEmpresa]:
        consulta = (
            select(PuntoEmisionModel, EmpresaModel)
            .join(UsuarioPuntoEmisionModel, UsuarioPuntoEmisionModel.punto_emision_id == PuntoEmisionModel.id)
            .join(EmpresaModel, EmpresaModel.id == PuntoEmisionModel.empresa_id)
            .where(
                UsuarioPuntoEmisionModel.usuario_id == usuario_id,
                EmpresaModel.activa.is_(True),
            )
            .order_by(EmpresaModel.nombre, PuntoEmisionModel.codigo)
        )
        resultado = await self.session.execute(consulta)
        agrupados: dict[int, AccesoEmpresa] = {}
        for punto_modelo, empresa_modelo in resultado.all():
            acceso = agrupados.get(empresa_modelo.id)
            if acceso is None:
                acceso = AccesoEmpresa(empresa=_empresa_desde_modelo(empresa_modelo), puntos_emision=[])
                agrupados[empresa_modelo.id] = acceso
            acceso.puntos_emision.append(_punto_desde_modelo(punto_modelo))
        return list(agrupados.values())

    async def obtener_punto_autorizado(
        self,
        usuario_id: int,
        punto_emision_id: int,
    ) -> PuntoEmision | None:
        consulta = (
            select(PuntoEmisionModel)
            .join(UsuarioPuntoEmisionModel, UsuarioPuntoEmisionModel.punto_emision_id == PuntoEmisionModel.id)
            .join(EmpresaModel, EmpresaModel.id == PuntoEmisionModel.empresa_id)
            .where(
                UsuarioPuntoEmisionModel.usuario_id == usuario_id,
                PuntoEmisionModel.id == punto_emision_id,
                EmpresaModel.activa.is_(True),
            )
        )
        resultado = await self.session.execute(consulta)
        modelo = resultado.scalars().first()
        return _punto_desde_modelo(modelo) if modelo else None
