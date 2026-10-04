from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.configuracion.domain.entities import EmpresaConfig, PuntoEmisionConfig
from app.modules.identidad.infrastructure.persistence.models import (
    EmpresaModel,
    PuntoEmisionModel,
    UsuarioPuntoEmisionModel,
)
from app.modules.facturacion.infrastructure.persistence.models import FormaPagoModel, FormaPagoSriModel


def _empresa(modelo: EmpresaModel) -> EmpresaConfig:
    return EmpresaConfig(
        id=modelo.id,
        nombre=modelo.nombre,
        slug=modelo.slug,
        ruc=modelo.ruc,
        direccion=modelo.direccion,
        telefono=modelo.telefono,
        correo=modelo.correo,
        sri_id=modelo.sri_id,
        entorno_sri=modelo.entorno_sri,
        moneda=modelo.moneda,
        idioma=modelo.idioma,
        zona_horaria=modelo.zona_horaria,
        ruta_logo=modelo.ruta_logo,
    )


def _punto(modelo: PuntoEmisionModel) -> PuntoEmisionConfig:
    return PuntoEmisionConfig(
        id=modelo.id,
        empresa_id=modelo.empresa_id,
        punto_emision=modelo.punto_emision,
        codigo=modelo.codigo,
        direccion=modelo.direccion,
        info=modelo.info,
        factura_seq=modelo.factura_seq,
        nota_credito_seq=modelo.nota_credito_seq,
        nota_debito_seq=modelo.nota_debito_seq,
        retencion_seq=modelo.retencion_seq,
        liquidacion_compra_seq=modelo.liquidacion_compra_seq,
        guia_remision_seq=modelo.guia_remision_seq,
        creado_en=modelo.creado_en,
    )


class SqlAlchemyEmpresaConfigRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def obtener(self, empresa_id: int) -> EmpresaConfig | None:
        modelo = await self.session.get(EmpresaModel, empresa_id)
        return _empresa(modelo) if modelo else None

    async def actualizar(self, empresa: EmpresaConfig) -> EmpresaConfig:
        modelo = await self.session.get(EmpresaModel, empresa.id)
        if modelo is None:
            return empresa
        modelo.nombre = empresa.nombre
        modelo.ruc = empresa.ruc
        modelo.direccion = empresa.direccion
        modelo.telefono = empresa.telefono
        modelo.correo = empresa.correo
        modelo.sri_id = empresa.sri_id
        modelo.entorno_sri = empresa.entorno_sri
        await self.session.commit()
        await self.session.refresh(modelo)
        return _empresa(modelo)


class SqlAlchemyPuntoConfigRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def listar(self, empresa_id: int) -> list[PuntoEmisionConfig]:
        resultado = await self.session.execute(
            select(PuntoEmisionModel)
            .where(PuntoEmisionModel.empresa_id == empresa_id)
            .order_by(PuntoEmisionModel.codigo, PuntoEmisionModel.punto_emision)
        )
        return [_punto(modelo) for modelo in resultado.scalars().all()]

    async def obtener(self, punto_id: int, empresa_id: int) -> PuntoEmisionConfig | None:
        resultado = await self.session.execute(
            select(PuntoEmisionModel).where(
                PuntoEmisionModel.id == punto_id,
                PuntoEmisionModel.empresa_id == empresa_id,
            )
        )
        modelo = resultado.scalars().first()
        return _punto(modelo) if modelo else None

    async def obtener_por_codigo(self, empresa_id: int, codigo: str, punto_emision: str) -> PuntoEmisionConfig | None:
        resultado = await self.session.execute(
            select(PuntoEmisionModel).where(
                PuntoEmisionModel.empresa_id == empresa_id,
                PuntoEmisionModel.codigo == codigo,
                PuntoEmisionModel.punto_emision == punto_emision,
            )
        )
        modelo = resultado.scalars().first()
        return _punto(modelo) if modelo else None

    async def guardar(self, punto: PuntoEmisionConfig) -> PuntoEmisionConfig:
        if punto.id:
            modelo = await self.session.get(PuntoEmisionModel, punto.id)
            if modelo is None:
                return punto
        else:
            modelo = PuntoEmisionModel(empresa_id=punto.empresa_id)
            self.session.add(modelo)
        modelo.punto_emision = punto.punto_emision
        modelo.codigo = punto.codigo
        modelo.direccion = punto.direccion
        modelo.info = punto.info
        modelo.factura_seq = punto.factura_seq
        modelo.nota_credito_seq = punto.nota_credito_seq
        modelo.nota_debito_seq = punto.nota_debito_seq
        modelo.retencion_seq = punto.retencion_seq
        modelo.liquidacion_compra_seq = punto.liquidacion_compra_seq
        modelo.guia_remision_seq = punto.guia_remision_seq
        await self.session.commit()
        await self.session.refresh(modelo)
        return _punto(modelo)

    async def eliminar(self, punto_id: int, empresa_id: int) -> bool:
        modelo = await self.session.get(PuntoEmisionModel, punto_id)
        if modelo is None or modelo.empresa_id != empresa_id:
            return False
        await self.session.delete(modelo)
        await self.session.commit()
        return True

    async def sembrar_formas_pago(self, empresa_id: int, punto_emision_id: int) -> None:
        plantillas = [
            ("EFE001", "Efectivo", "01", True, True),
            ("CHE001", "Cheque", "20", True, True),
            ("TRA001", "Transferencia", "20", True, True),
            ("TDE001", "Tarjeta de Débito", "16", True, False),
            ("TCR001", "Tarjeta de crédito", "19", True, True),
            ("NCR001", "Nota de Crédito", "20", True, True),
            ("DEP001", "Depósito", "20", True, True),
            ("TCP001", "Tarjeta De Credito Por Pagar", "20", False, True),
            ("DEC001", "Descuento En Compras", "20", False, True),
            ("GND001", "Gastos No Deducible", "20", False, True),
            ("DCL001", "Devolucion Clientes", "20", True, False),
        ]
        sri_rows = {
            row.codigo: row.id
            for row in (await self.session.execute(select(FormaPagoSriModel))).scalars()
        }
        existentes = {
            row.codigo
            for row in (
                await self.session.execute(
                    select(FormaPagoModel).where(
                        FormaPagoModel.empresa_id == empresa_id,
                        FormaPagoModel.punto_emision_id == punto_emision_id,
                    )
                )
            ).scalars()
        }
        for codigo, nombre, codigo_sri, venta, compra in plantillas:
            if codigo in existentes:
                continue
            self.session.add(
                FormaPagoModel(
                    empresa_id=empresa_id,
                    punto_emision_id=punto_emision_id,
                    codigo=codigo,
                    nombre=nombre,
                    forma_pago_sri_id=sri_rows.get(codigo_sri),
                    aplica_venta=venta,
                    aplica_compra=compra,
                    activo=True,
                )
            )
        await self.session.commit()

    async def asignar_usuario(self, usuario_id: int, punto_emision_id: int) -> None:
        resultado = await self.session.execute(
            select(UsuarioPuntoEmisionModel).where(
                UsuarioPuntoEmisionModel.usuario_id == usuario_id,
                UsuarioPuntoEmisionModel.punto_emision_id == punto_emision_id,
            )
        )
        if resultado.scalars().first():
            return
        self.session.add(UsuarioPuntoEmisionModel(usuario_id=usuario_id, punto_emision_id=punto_emision_id))
        await self.session.commit()
