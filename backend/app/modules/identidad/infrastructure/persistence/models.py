from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EmpresaModel(Base):
    __tablename__ = "empresas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    ruc: Mapped[str] = mapped_column(String(13), unique=True, nullable=False)
    direccion: Mapped[str] = mapped_column(Text, nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(20))
    correo: Mapped[str | None] = mapped_column(String(255))
    sri_id: Mapped[int | None] = mapped_column(Integer)
    moneda: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    idioma: Mapped[str] = mapped_column(String(5), default="es", nullable=False)
    zona_horaria: Mapped[str] = mapped_column(String(50), default="America/Guayaquil", nullable=False)
    entorno_sri: Mapped[str] = mapped_column(String(1), default="1", nullable=False)
    ruta_logo: Mapped[str | None] = mapped_column(String(255))
    activa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    verificada: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    plan_suscripcion: Mapped[str] = mapped_column(String(50), default="basic", nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    puntos_emision: Mapped[list["PuntoEmisionModel"]] = relationship(back_populates="empresa")
    usuarios: Mapped[list["UsuarioModel"]] = relationship(back_populates="empresa")


class PuntoEmisionModel(Base):
    __tablename__ = "puntos_emision"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True, nullable=False)
    punto_emision: Mapped[str] = mapped_column(String(20), nullable=False)
    codigo: Mapped[str] = mapped_column(String(20), nullable=False)
    direccion: Mapped[str] = mapped_column(String(255), nullable=False)
    factura_seq: Mapped[int] = mapped_column(default=0, nullable=False)
    nota_credito_seq: Mapped[int] = mapped_column(default=0, nullable=False)
    nota_debito_seq: Mapped[int] = mapped_column(default=0, nullable=False)
    retencion_seq: Mapped[int] = mapped_column(default=0, nullable=False)
    liquidacion_compra_seq: Mapped[int] = mapped_column(default=0, nullable=False)
    guia_remision_seq: Mapped[int] = mapped_column(default=0, nullable=False)
    info: Mapped[str | None] = mapped_column(Text)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    empresa: Mapped[EmpresaModel] = relationship(back_populates="puntos_emision")


class UsuarioModel(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        UniqueConstraint("correo", "empresa_id", name="uq_usuarios_correo_empresa"),
        UniqueConstraint("nombre_usuario", "empresa_id", name="uq_usuarios_nombre_usuario_empresa"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True, nullable=False)
    correo: Mapped[str] = mapped_column(String, index=True, nullable=False)
    nombre_usuario: Mapped[str] = mapped_column(String, index=True, nullable=False)
    nombre_completo: Mapped[str] = mapped_column(String, nullable=False)
    contrasena_hash: Mapped[str] = mapped_column(String, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    verificado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ultimo_acceso: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    empresa: Mapped[EmpresaModel] = relationship(back_populates="usuarios")
    roles: Mapped[list["UsuarioRolModel"]] = relationship(back_populates="usuario", cascade="all, delete-orphan")
    puntos: Mapped[list["UsuarioPuntoEmisionModel"]] = relationship(
        back_populates="usuario",
        cascade="all, delete-orphan",
    )


class RolModel(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String)
    es_sistema: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PermisoModel(Base):
    __tablename__ = "permisos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String)
    es_sistema: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RolPermisoModel(Base):
    __tablename__ = "roles_permisos"
    __table_args__ = (UniqueConstraint("rol_id", "permiso_id", name="uq_roles_permisos"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rol_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    permiso_id: Mapped[int] = mapped_column(ForeignKey("permisos.id", ondelete="CASCADE"), nullable=False)


class UsuarioRolModel(Base):
    __tablename__ = "usuarios_roles"
    __table_args__ = (UniqueConstraint("usuario_id", "rol_id", name="uq_usuarios_roles"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    rol_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)

    usuario: Mapped[UsuarioModel] = relationship(back_populates="roles")
    rol: Mapped[RolModel] = relationship()


class UsuarioPuntoEmisionModel(Base):
    __tablename__ = "usuarios_puntos_emision"
    __table_args__ = (
        UniqueConstraint("usuario_id", "punto_emision_id", name="uq_usuarios_puntos_emision"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    punto_emision_id: Mapped[int] = mapped_column(
        ForeignKey("puntos_emision.id", ondelete="CASCADE"),
        nullable=False,
    )

    usuario: Mapped[UsuarioModel] = relationship(back_populates="puntos")
    punto: Mapped[PuntoEmisionModel] = relationship()
