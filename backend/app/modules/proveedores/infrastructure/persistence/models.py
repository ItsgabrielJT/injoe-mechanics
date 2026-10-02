from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.proveedores.domain.entities import TipoPersona


class ProveedorModel(Base):
    __tablename__ = "proveedores"
    __table_args__ = (
        UniqueConstraint("empresa_id", "punto_emision_id", "identificacion", name="uq_proveedores_identificacion_punto"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True, nullable=False)
    punto_emision_id: Mapped[int] = mapped_column(ForeignKey("puntos_emision.id"), index=True, nullable=False)
    identificacion: Mapped[str] = mapped_column(String(13), index=True, nullable=False)
    tipo_persona: Mapped[TipoPersona] = mapped_column(
        Enum(
            TipoPersona,
            name="tipo_cliente",
            native_enum=True,
            create_type=False,
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
        default=TipoPersona.PERSONA_NATURAL,
    )
    nombres: Mapped[str] = mapped_column(String(255), nullable=False)
    razon_social: Mapped[str | None] = mapped_column(String(255))
    direccion: Mapped[str | None] = mapped_column(Text)
    telefono: Mapped[str | None] = mapped_column(String(20))
    correo: Mapped[str | None] = mapped_column(String(255))
    direccion_fiscal: Mapped[str | None] = mapped_column(Text)
    telefono_fiscal: Mapped[str | None] = mapped_column(String(20))
    correo_fiscal: Mapped[str | None] = mapped_column(String(255))
    notas: Mapped[str | None] = mapped_column(Text)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())


class ProductoProveedorModel(Base):
    __tablename__ = "productos_proveedores"
    __table_args__ = (UniqueConstraint("producto_id", "proveedor_id", name="uq_productos_proveedores"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id", ondelete="CASCADE"), index=True, nullable=False)
    proveedor_id: Mapped[int] = mapped_column(ForeignKey("proveedores.id", ondelete="CASCADE"), index=True, nullable=False)
    precio_compra: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    es_principal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    proveedor: Mapped[ProveedorModel] = relationship()


class ServicioProveedorModel(Base):
    __tablename__ = "servicios_proveedores"
    __table_args__ = (UniqueConstraint("servicio_id", "proveedor_id", name="uq_servicios_proveedores"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    servicio_id: Mapped[int] = mapped_column(ForeignKey("servicios.id", ondelete="CASCADE"), index=True, nullable=False)
    proveedor_id: Mapped[int] = mapped_column(ForeignKey("proveedores.id", ondelete="CASCADE"), index=True, nullable=False)
    precio_compra: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    es_principal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    proveedor: Mapped[ProveedorModel] = relationship()
