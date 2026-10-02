from decimal import Decimal

from app.modules.inventario.application.dto import ContextoTenant, ListarMovimientosQuery, RegistrarMovimientoCommand
from app.modules.inventario.application.ports.repositorios import (
    BodegaRepository,
    MovimientoInventarioRepository,
    ProductoRepository,
)
from app.modules.inventario.domain.entities import (
    INTENTOS_CODIGO,
    LineaMovimiento,
    MovimientoInventario,
    TipoMovimiento,
    cantidad_valida,
    generar_codigo_lote,
)
from app.modules.inventario.domain.exceptions import (
    BodegaDestinoRequerida,
    BodegaInactiva,
    BodegaNoEncontrada,
    CantidadInvalida,
    CodigoDuplicado,
    ItemsRequeridos,
    MovimientoNoEncontrado,
    ProductoNoEncontrado,
    ProductoSinInventario,
    TipoAjusteRequerido,
)


class RegistrarMovimientoUseCase:
    def __init__(
        self,
        movimiento_repository: MovimientoInventarioRepository,
        producto_repository: ProductoRepository,
        bodega_repository: BodegaRepository,
    ) -> None:
        self.movimiento_repository = movimiento_repository
        self.producto_repository = producto_repository
        self.bodega_repository = bodega_repository

    async def execute(self, command: RegistrarMovimientoCommand, tenant: ContextoTenant) -> MovimientoInventario:
        if command.tipo == TipoMovimiento.STOCK_INICIAL:
            raise ItemsRequeridos("El stock inicial solo se registra al crear el producto")
        if not command.items:
            raise ItemsRequeridos()

        bodega = await self.bodega_repository.obtener_por_id(command.bodega_id, tenant.empresa_id, tenant.punto_emision_id)
        if bodega is None:
            raise BodegaNoEncontrada()
        if not bodega.activo:
            raise BodegaInactiva()

        bodega_destino_id = None
        if command.tipo == TipoMovimiento.TRANSFERENCIA:
            if not command.bodega_destino_id or command.bodega_destino_id == command.bodega_id:
                raise BodegaDestinoRequerida()
            destino = await self.bodega_repository.obtener_por_id(
                command.bodega_destino_id, tenant.empresa_id, tenant.punto_emision_id
            )
            if destino is None:
                raise BodegaNoEncontrada("Bodega destino no encontrada")
            if not destino.activo:
                raise BodegaInactiva("La bodega destino no está activa")
            bodega_destino_id = destino.id
        elif command.bodega_destino_id:
            raise BodegaDestinoRequerida("Solo la transferencia admite bodega destino")

        tipo_ajuste = None
        if command.tipo == TipoMovimiento.AJUSTE:
            if command.tipo_ajuste is None:
                raise TipoAjusteRequerido()
            tipo_ajuste = command.tipo_ajuste
        elif command.tipo_ajuste is not None:
            raise TipoAjusteRequerido("El tipo de ajuste solo aplica a movimientos de ajuste")

        lineas: list[LineaMovimiento] = []
        vistos: set[int] = set()
        for item in command.items:
            if item.producto_id in vistos:
                raise ItemsRequeridos("No puedes repetir el mismo producto en el lote")
            vistos.add(item.producto_id)
            if not cantidad_valida(Decimal(item.cantidad)):
                raise CantidadInvalida()
            producto = await self.producto_repository.obtener_por_id(
                item.producto_id, tenant.empresa_id, tenant.punto_emision_id
            )
            if producto is None:
                raise ProductoNoEncontrado(f"Producto {item.producto_id} no encontrado")
            if not producto.aplica_inventario:
                raise ProductoSinInventario(f"{producto.nombre} no aplica inventario")
            lineas.append(
                LineaMovimiento(
                    producto_id=item.producto_id,
                    cantidad=Decimal(item.cantidad),
                    stock_origen_despues=Decimal("0"),
                    producto_codigo=producto.codigo,
                    producto_nombre=producto.nombre,
                )
            )

        codigo = await self._codigo_lote(tenant)
        return await self.movimiento_repository.registrar(
            MovimientoInventario(
                id=None,
                empresa_id=tenant.empresa_id,
                punto_emision_id=tenant.punto_emision_id,
                codigo=codigo,
                tipo=command.tipo,
                bodega_id=command.bodega_id,
                bodega_destino_id=bodega_destino_id,
                tipo_ajuste=tipo_ajuste,
                nota=command.nota.strip() if command.nota else None,
                observacion=command.observacion.strip() if command.observacion else None,
                lineas=lineas,
            )
        )

    async def _codigo_lote(self, tenant: ContextoTenant) -> str:
        for _ in range(INTENTOS_CODIGO):
            codigo = generar_codigo_lote()
            existente = await self.movimiento_repository.obtener_por_codigo(
                codigo, tenant.empresa_id, tenant.punto_emision_id
            )
            if existente is None:
                return codigo
        raise CodigoDuplicado("No se pudo generar un código de lote único")


class ObtenerMovimientoUseCase:
    def __init__(self, movimiento_repository: MovimientoInventarioRepository) -> None:
        self.movimiento_repository = movimiento_repository

    async def execute(self, movimiento_id: int, tenant: ContextoTenant) -> MovimientoInventario:
        movimiento = await self.movimiento_repository.obtener_por_id(
            movimiento_id, tenant.empresa_id, tenant.punto_emision_id
        )
        if movimiento is None:
            raise MovimientoNoEncontrado()
        return movimiento


class ListarMovimientosUseCase:
    def __init__(self, movimiento_repository: MovimientoInventarioRepository) -> None:
        self.movimiento_repository = movimiento_repository

    async def execute(
        self, query: ListarMovimientosQuery, tenant: ContextoTenant
    ) -> tuple[list[MovimientoInventario], int]:
        return await self.movimiento_repository.listar(tenant.empresa_id, tenant.punto_emision_id, query)
