from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum, ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.inventario.domain.entities import TipoAjuste, TipoImpuesto, TipoMovimiento


class CategoriaProductoModel(Base):
    __tablename__ = "categorias_producto"
    __table_args__ = (
        UniqueConstraint("empresa_id", "punto_emision_id", "nombre", name="uq_categorias_producto_nombre_punto"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True, nullable=False)
    punto_emision_id: Mapped[int] = mapped_column(ForeignKey("puntos_emision.id"), index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(500))
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())


class BodegaModel(Base):
    __tablename__ = "bodegas"
    __table_args__ = (
        UniqueConstraint("empresa_id", "punto_emision_id", "nombre", name="uq_bodegas_nombre_punto"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True, nullable=False)
    punto_emision_id: Mapped[int] = mapped_column(ForeignKey("puntos_emision.id"), index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    ubicacion: Mapped[str | None] = mapped_column(String(255))
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())


class ProductoModel(Base):
    __tablename__ = "productos"
    __table_args__ = (
        UniqueConstraint("empresa_id", "punto_emision_id", "codigo", name="uq_productos_codigo_punto"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True, nullable=False)
    punto_emision_id: Mapped[int] = mapped_column(ForeignKey("puntos_emision.id"), index=True, nullable=False)
    codigo: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    codigo_barras: Mapped[str | None] = mapped_column(String(64))
    nombre: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(500))
    categoria_id: Mapped[int] = mapped_column(ForeignKey("categorias_producto.id"), index=True, nullable=False)
    precio_venta: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    aplica_iva: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    aplica_inventario: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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
    stock_minimo: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    stock_maximo: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    unidad_medida: Mapped[str] = mapped_column(String(20), default="UN", nullable=False)
    peso: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    categoria: Mapped[CategoriaProductoModel] = relationship()


class ExistenciaModel(Base):
    __tablename__ = "existencias"
    __table_args__ = (UniqueConstraint("producto_id", "bodega_id", name="uq_existencias_producto_bodega"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), index=True, nullable=False)
    bodega_id: Mapped[int] = mapped_column(ForeignKey("bodegas.id"), index=True, nullable=False)
    cantidad: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    bodega: Mapped[BodegaModel] = relationship()


class MovimientoInventarioModel(Base):
    __tablename__ = "movimientos_inventario"
    __table_args__ = (
        UniqueConstraint("empresa_id", "punto_emision_id", "codigo", name="uq_movimientos_inventario_codigo_punto"),
        CheckConstraint(
            "(tipo <> 'TRANSFERENCIA' AND bodega_destino_id IS NULL) OR "
            "(tipo = 'TRANSFERENCIA' AND bodega_destino_id IS NOT NULL AND bodega_destino_id <> bodega_id)",
            name="ck_movimientos_transferencia",
        ),
        CheckConstraint(
            "(tipo <> 'AJUSTE' AND tipo_ajuste IS NULL) OR (tipo = 'AJUSTE' AND tipo_ajuste IS NOT NULL)",
            name="ck_movimientos_ajuste",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True, nullable=False)
    punto_emision_id: Mapped[int] = mapped_column(ForeignKey("puntos_emision.id"), index=True, nullable=False)
    codigo: Mapped[str] = mapped_column(String(20), nullable=False)
    tipo: Mapped[TipoMovimiento] = mapped_column(
        Enum(
            TipoMovimiento,
            name="tipo_movimiento_inventario",
            native_enum=True,
            create_type=False,
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
    )
    bodega_id: Mapped[int] = mapped_column(ForeignKey("bodegas.id"), index=True, nullable=False)
    bodega_destino_id: Mapped[int | None] = mapped_column(ForeignKey("bodegas.id"))
    tipo_ajuste: Mapped[TipoAjuste | None] = mapped_column(
        Enum(
            TipoAjuste,
            name="tipo_ajuste_inventario",
            native_enum=True,
            create_type=False,
            values_callable=lambda enum: [item.value for item in enum],
        ),
    )
    nota: Mapped[str | None] = mapped_column(String(255))
    observacion: Mapped[str | None] = mapped_column(String(500))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    bodega: Mapped[BodegaModel] = relationship(foreign_keys=[bodega_id])
    bodega_destino: Mapped[BodegaModel | None] = relationship(foreign_keys=[bodega_destino_id])
    lineas: Mapped[list["MovimientoLineaModel"]] = relationship(cascade="all, delete-orphan")


class MovimientoLineaModel(Base):
    __tablename__ = "movimientos_inventario_lineas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    movimiento_id: Mapped[int] = mapped_column(ForeignKey("movimientos_inventario.id", ondelete="CASCADE"), index=True, nullable=False)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), index=True, nullable=False)
    cantidad: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    stock_origen_despues: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    stock_destino_despues: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))

    producto: Mapped[ProductoModel] = relationship()
