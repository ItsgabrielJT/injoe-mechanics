from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.facturacion.domain.entities import EstadoFactura, TipoReceptor
from app.modules.inventario.domain.entities import TipoImpuesto


class FormaPagoSriModel(Base):
    __tablename__ = "formas_pago_sri"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())


class FormaPagoModel(Base):
    __tablename__ = "formas_pago"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True, nullable=False)
    punto_emision_id: Mapped[int] = mapped_column(ForeignKey("puntos_emision.id"), index=True, nullable=False)
    codigo: Mapped[str] = mapped_column(String(30), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    forma_pago_sri_id: Mapped[int | None] = mapped_column(ForeignKey("formas_pago_sri.id"))
    aplica_venta: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    aplica_compra: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    forma_pago_sri: Mapped[FormaPagoSriModel | None] = relationship()


class FacturaModel(Base):
    __tablename__ = "facturas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True, nullable=False)
    punto_emision_id: Mapped[int] = mapped_column(ForeignKey("puntos_emision.id"), index=True, nullable=False)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    cliente_id: Mapped[int | None] = mapped_column(ForeignKey("clientes.id"))
    orden_trabajo_id: Mapped[int | None] = mapped_column(ForeignKey("ordenes_trabajo.id"))
    forma_pago_id: Mapped[int | None] = mapped_column(ForeignKey("formas_pago.id"))
    numero: Mapped[str] = mapped_column(String(20), nullable=False)
    tipo_receptor: Mapped[TipoReceptor] = mapped_column(
        Enum(TipoReceptor, name="tipo_receptor_factura", native_enum=True, create_type=False, values_callable=lambda e: [i.value for i in e]),
        nullable=False,
    )
    estado: Mapped[EstadoFactura] = mapped_column(
        Enum(EstadoFactura, name="estado_factura", native_enum=True, create_type=False, values_callable=lambda e: [i.value for i in e]),
        nullable=False,
        default=EstadoFactura.BORRADOR,
    )
    clave_acceso: Mapped[str | None] = mapped_column(String(64))
    xml_content: Mapped[str | None] = mapped_column(Text)
    reason_error: Mapped[str | None] = mapped_column(Text)
    numero_autorizacion: Mapped[str | None] = mapped_column(String(60))
    fecha_emision: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_vencimiento: Mapped[date | None] = mapped_column(Date)
    fecha_pago: Mapped[date | None] = mapped_column(Date)
    fecha_autorizacion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    subtotal_15: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    subtotal_5: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    subtotal_0: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    subtotal_objeto: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    subtotal_exento: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    iva_15: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    iva_5: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    ice: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    irbpnr: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    descuento: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    notas: Mapped[str | None] = mapped_column(Text)
    terminos: Mapped[str | None] = mapped_column(Text)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    items: Mapped[list["FacturaItemModel"]] = relationship(back_populates="factura", cascade="all, delete-orphan")
    forma_pago: Mapped[FormaPagoModel | None] = relationship()


class FacturaItemModel(Base):
    __tablename__ = "facturas_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    factura_id: Mapped[int] = mapped_column(ForeignKey("facturas.id", ondelete="CASCADE"), index=True, nullable=False)
    producto_id: Mapped[int | None] = mapped_column(ForeignKey("productos.id"))
    servicio_id: Mapped[int | None] = mapped_column(ForeignKey("servicios.id"))
    bodega_id: Mapped[int | None] = mapped_column(ForeignKey("bodegas.id"))
    descripcion: Mapped[str] = mapped_column(String(500), nullable=False)
    codigo: Mapped[str | None] = mapped_column(String(50))
    cantidad: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    descuento_porcentaje: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    aplica_iva: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    tipo_impuesto: Mapped[TipoImpuesto] = mapped_column(
        Enum(TipoImpuesto, name="tipo_impuesto", native_enum=True, create_type=False, values_callable=lambda e: [i.value for i in e]),
        nullable=False,
    )
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    iva_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    ice_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    irbpnr_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    factura: Mapped[FacturaModel] = relationship(back_populates="items")
