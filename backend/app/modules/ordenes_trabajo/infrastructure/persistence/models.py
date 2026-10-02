from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.inventario.domain.entities import TipoImpuesto
from app.modules.ordenes_trabajo.domain.entities import EstadoOrden


class OrdenTrabajoModel(Base):
    __tablename__ = "ordenes_trabajo"
    __table_args__ = (
        UniqueConstraint("empresa_id", "punto_emision_id", "numero", name="uq_ordenes_trabajo_numero_punto"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True, nullable=False)
    punto_emision_id: Mapped[int] = mapped_column(ForeignKey("puntos_emision.id"), index=True, nullable=False)
    numero: Mapped[str] = mapped_column(String(20), nullable=False)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"), index=True, nullable=False)
    vehiculo_id: Mapped[int] = mapped_column(ForeignKey("vehiculos.id"), index=True, nullable=False)
    tecnico_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True, nullable=False)
    estado: Mapped[EstadoOrden] = mapped_column(
        Enum(EstadoOrden, name="estado_orden_trabajo", native_enum=True, create_type=False, values_callable=lambda enum: [item.value for item in enum]),
        nullable=False,
        default=EstadoOrden.EN_PROCESO,
    )
    fecha_inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fecha_entrega: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    kilometraje: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    notas_generales: Mapped[str | None] = mapped_column(Text)
    notas_tecnicas: Mapped[str | None] = mapped_column(Text)
    total_productos: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    total_servicios: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    total_costo: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    total_utilidad: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    items: Mapped[list["OrdenTrabajoItemModel"]] = relationship(cascade="all, delete-orphan")


class OrdenTrabajoItemModel(Base):
    __tablename__ = "ordenes_trabajo_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    orden_id: Mapped[int] = mapped_column(ForeignKey("ordenes_trabajo.id", ondelete="CASCADE"), index=True, nullable=False)
    producto_id: Mapped[int | None] = mapped_column(ForeignKey("productos.id"), index=True)
    servicio_id: Mapped[int | None] = mapped_column(ForeignKey("servicios.id"), index=True)
    proveedor_id: Mapped[int | None] = mapped_column(ForeignKey("proveedores.id"), index=True)
    bodega_id: Mapped[int | None] = mapped_column(ForeignKey("bodegas.id"))
    descripcion: Mapped[str] = mapped_column(String(500), nullable=False)
    codigo: Mapped[str | None] = mapped_column(String(50))
    cantidad: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    precio_venta: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    precio_compra: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"), nullable=False)
    aplica_iva: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    tipo_impuesto: Mapped[TipoImpuesto] = mapped_column(
        Enum(TipoImpuesto, name="tipo_impuesto", native_enum=True, create_type=False, values_callable=lambda enum: [item.value for item in enum]),
        nullable=False,
    )
    utilidad: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())
