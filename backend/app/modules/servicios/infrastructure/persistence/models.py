from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.modules.servicios.domain.entities import CategoriaServicio, TipoImpuesto


class ServicioModel(Base):
    __tablename__ = "servicios"
    __table_args__ = (
        UniqueConstraint("empresa_id", "punto_emision_id", "codigo", name="uq_servicios_codigo_punto"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True, nullable=False)
    punto_emision_id: Mapped[int] = mapped_column(ForeignKey("puntos_emision.id"), index=True, nullable=False)
    codigo: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(500))
    categoria: Mapped[CategoriaServicio | None] = mapped_column(
        Enum(
            CategoriaServicio,
            name="categoria_servicio",
            native_enum=True,
            create_type=False,
            values_callable=lambda enum: [item.value for item in enum],
        ),
    )
    precio_venta: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    aplica_iva: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    tipo_impuesto: Mapped[TipoImpuesto] = mapped_column(
        Enum(
            TipoImpuesto,
            name="tipo_impuesto",
            native_enum=True,
            create_type=False,
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
    )
    peso: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())
