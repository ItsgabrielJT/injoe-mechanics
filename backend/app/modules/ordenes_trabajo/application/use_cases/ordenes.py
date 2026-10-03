from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from app.modules.clientes.application.ports.repositorios import ClienteRepository, VehiculoRepository
from app.modules.clientes.domain.exceptions import ClienteNoEncontrado, VehiculoNoEncontrado
from app.modules.identidad.application.ports.repositorios import UsuarioRepository
from app.modules.inventario.application.ports.repositorios import BodegaRepository, MovimientoInventarioRepository, ProductoRepository
from app.modules.inventario.domain.entities import INTENTOS_CODIGO, LineaMovimiento, MovimientoInventario, TipoMovimiento, generar_codigo_lote
from app.modules.inventario.domain.exceptions import BodegaNoEncontrada, ProductoNoEncontrado
from app.modules.ordenes_trabajo.application.dto import ContextoTenant, GuardarOrdenCommand, ItemOrdenCommand, ListarOrdenesQuery
from app.modules.ordenes_trabajo.application.ports.repositorios import OrdenTrabajoRepository
from app.modules.ordenes_trabajo.domain.entities import EstadoOrden, OrdenTrabajo, OrdenTrabajoItem
from app.modules.ordenes_trabajo.domain.exceptions import (
    BodegaRequerida,
    ItemInvalido,
    OrdenCerrada,
    OrdenNoEncontrada,
    TecnicoNoEncontrado,
    VehiculoNoPertenece,
)
from app.modules.proveedores.application.dto import ContextoTenant as TenantProveedor
from app.modules.proveedores.application.dto import UpsertPrecioCommand
from app.modules.proveedores.application.ports.repositorios import ProveedorRepository
from app.modules.proveedores.application.use_cases.precios import UpsertPrecioUseCase
from app.modules.proveedores.domain.exceptions import ProveedorNoEncontrado
from app.modules.servicios.application.ports.repositorios import ServicioRepository
from app.modules.servicios.domain.exceptions import ServicioNoEncontrado

ECUADOR = ZoneInfo("America/Guayaquil")


def ahora_ecuador() -> datetime:
    return datetime.now(ECUADOR)


class GuardarOrdenUseCase:
    def __init__(
        self,
        orden_repository: OrdenTrabajoRepository,
        cliente_repository: ClienteRepository,
        vehiculo_repository: VehiculoRepository,
        usuario_repository: UsuarioRepository,
        producto_repository: ProductoRepository,
        servicio_repository: ServicioRepository,
        proveedor_repository: ProveedorRepository,
        bodega_repository: BodegaRepository,
        upsert_precio: UpsertPrecioUseCase,
    ) -> None:
        self.orden_repository = orden_repository
        self.cliente_repository = cliente_repository
        self.vehiculo_repository = vehiculo_repository
        self.usuario_repository = usuario_repository
        self.producto_repository = producto_repository
        self.servicio_repository = servicio_repository
        self.proveedor_repository = proveedor_repository
        self.bodega_repository = bodega_repository
        self.upsert_precio = upsert_precio

    async def execute(self, command: GuardarOrdenCommand, tenant: ContextoTenant) -> OrdenTrabajo:
        if command.orden_id:
            orden = await self.orden_repository.obtener_por_id(command.orden_id, tenant.empresa_id, tenant.punto_emision_id)
            if orden is None:
                raise OrdenNoEncontrada()
            if orden.estado == EstadoOrden.CERRADA:
                raise OrdenCerrada()
        else:
            orden = OrdenTrabajo(
                id=None,
                empresa_id=tenant.empresa_id,
                punto_emision_id=tenant.punto_emision_id,
                numero=await self.orden_repository.siguiente_numero(tenant.empresa_id, tenant.punto_emision_id),
                cliente_id=command.cliente_id,
                vehiculo_id=command.vehiculo_id,
                tecnico_id=command.tecnico_id,
                estado=EstadoOrden.EN_PROCESO,
                fecha_inicio=command.fecha_inicio or ahora_ecuador(),
            )

        await self._validar_relaciones(command, tenant)
        orden.cliente_id = command.cliente_id
        orden.vehiculo_id = command.vehiculo_id
        orden.tecnico_id = command.tecnico_id
        orden.fecha_inicio = command.fecha_inicio or orden.fecha_inicio or ahora_ecuador()
        orden.fecha_entrega = command.fecha_entrega
        orden.kilometraje = command.kilometraje
        orden.notas_generales = command.notas_generales.strip() if command.notas_generales else None
        orden.notas_tecnicas = command.notas_tecnicas.strip() if command.notas_tecnicas else None
        orden.items = await self._armar_items(command.items, tenant)
        orden.calcular_totales()
        return await self.orden_repository.guardar(orden)

    async def _validar_relaciones(self, command: GuardarOrdenCommand, tenant: ContextoTenant) -> None:
        cliente = await self.cliente_repository.obtener_por_id(command.cliente_id, tenant.empresa_id, tenant.punto_emision_id)
        if cliente is None:
            raise ClienteNoEncontrado()
        vehiculo = await self.vehiculo_repository.obtener_por_id(command.vehiculo_id, tenant.empresa_id, tenant.punto_emision_id)
        if vehiculo is None:
            raise VehiculoNoEncontrado()
        if vehiculo.cliente_id != command.cliente_id:
            raise VehiculoNoPertenece()
        tecnico = await self.usuario_repository.obtener_por_id(command.tecnico_id)
        if tecnico is None or not tecnico.activo or tecnico.empresa_id != tenant.empresa_id:
            raise TecnicoNoEncontrado()
        if not await self.usuario_repository.tiene_punto(command.tecnico_id, tenant.punto_emision_id):
            raise TecnicoNoEncontrado()

    async def _armar_items(self, commands: list[ItemOrdenCommand], tenant: ContextoTenant) -> list[OrdenTrabajoItem]:
        items: list[OrdenTrabajoItem] = []
        for command in commands:
            if bool(command.producto_id) == bool(command.servicio_id):
                raise ItemInvalido("Cada línea debe ser producto o servicio")
            if command.proveedor_id:
                proveedor = await self.proveedor_repository.obtener_por_id(
                    command.proveedor_id, tenant.empresa_id, tenant.punto_emision_id
                )
                if proveedor is None:
                    raise ProveedorNoEncontrado()
            if Decimal(command.cantidad) <= 0 or Decimal(command.precio_venta) < 0 or Decimal(command.precio_compra) < 0:
                raise ItemInvalido("Cantidad y precios inválidos")

            descripcion = command.descripcion
            codigo = command.codigo
            bodega_id = command.bodega_id
            if command.producto_id:
                producto = await self.producto_repository.obtener_por_id(
                    command.producto_id, tenant.empresa_id, tenant.punto_emision_id
                )
                if producto is None:
                    raise ProductoNoEncontrado()
                descripcion = descripcion or producto.nombre
                codigo = codigo or producto.codigo
                if producto.aplica_inventario and not bodega_id:
                    raise BodegaRequerida()
                if not producto.aplica_inventario:
                    bodega_id = None
                if command.proveedor_id and Decimal(command.precio_compra) > 0:
                    await self.upsert_precio.execute(
                        UpsertPrecioCommand(
                            proveedor_id=command.proveedor_id,
                            precio_compra=Decimal(command.precio_compra),
                            producto_id=command.producto_id,
                        ),
                        TenantProveedor(empresa_id=tenant.empresa_id, punto_emision_id=tenant.punto_emision_id),
                    )
            else:
                servicio = await self.servicio_repository.obtener_por_id(
                    command.servicio_id or 0, tenant.empresa_id, tenant.punto_emision_id
                )
                if servicio is None:
                    raise ServicioNoEncontrado()
                descripcion = descripcion or servicio.nombre
                codigo = codigo or servicio.codigo
                bodega_id = None
                if command.proveedor_id and Decimal(command.precio_compra) > 0:
                    await self.upsert_precio.execute(
                        UpsertPrecioCommand(
                            proveedor_id=command.proveedor_id,
                            precio_compra=Decimal(command.precio_compra),
                            servicio_id=command.servicio_id,
                        ),
                        TenantProveedor(empresa_id=tenant.empresa_id, punto_emision_id=tenant.punto_emision_id),
                    )
            if bodega_id:
                bodega = await self.bodega_repository.obtener_por_id(bodega_id, tenant.empresa_id, tenant.punto_emision_id)
                if bodega is None:
                    raise BodegaNoEncontrada()

            items.append(
                OrdenTrabajoItem(
                    id=None,
                    producto_id=command.producto_id,
                    servicio_id=command.servicio_id,
                    proveedor_id=command.proveedor_id,
                    bodega_id=bodega_id,
                    descripcion=descripcion or "",
                    codigo=codigo,
                    cantidad=Decimal(command.cantidad),
                    precio_venta=Decimal(command.precio_venta),
                    precio_compra=Decimal(command.precio_compra),
                    aplica_iva=command.aplica_iva,
                    tipo_impuesto=command.tipo_impuesto,
                    utilidad=Decimal("0"),
                    total=Decimal("0"),
                )
            )
        return items


class ObtenerOrdenUseCase:
    def __init__(self, orden_repository: OrdenTrabajoRepository) -> None:
        self.orden_repository = orden_repository

    async def execute(self, orden_id: int, tenant: ContextoTenant) -> OrdenTrabajo:
        orden = await self.orden_repository.obtener_por_id(orden_id, tenant.empresa_id, tenant.punto_emision_id)
        if orden is None:
            raise OrdenNoEncontrada()
        return orden


class ListarOrdenesUseCase:
    def __init__(self, orden_repository: OrdenTrabajoRepository) -> None:
        self.orden_repository = orden_repository

    async def execute(self, query: ListarOrdenesQuery, tenant: ContextoTenant):
        return await self.orden_repository.listar(tenant.empresa_id, tenant.punto_emision_id, query)


class EliminarOrdenUseCase:
    def __init__(self, orden_repository: OrdenTrabajoRepository) -> None:
        self.orden_repository = orden_repository

    async def execute(self, orden_id: int, tenant: ContextoTenant) -> None:
        orden = await self.orden_repository.obtener_por_id(orden_id, tenant.empresa_id, tenant.punto_emision_id)
        if orden is None:
            raise OrdenNoEncontrada()
        if orden.estado == EstadoOrden.CERRADA:
            raise OrdenCerrada("No se puede eliminar una orden cerrada")
        await self.orden_repository.eliminar(orden_id, tenant.empresa_id, tenant.punto_emision_id)


class CerrarOrdenUseCase:
    def __init__(
        self,
        orden_repository: OrdenTrabajoRepository,
        producto_repository: ProductoRepository,
        movimiento_repository: MovimientoInventarioRepository,
    ) -> None:
        self.orden_repository = orden_repository
        self.producto_repository = producto_repository
        self.movimiento_repository = movimiento_repository

    async def execute(self, orden_id: int, tenant: ContextoTenant) -> OrdenTrabajo:
        orden = await self.orden_repository.obtener_por_id(orden_id, tenant.empresa_id, tenant.punto_emision_id)
        if orden is None:
            raise OrdenNoEncontrada()
        if orden.estado == EstadoOrden.CERRADA:
            raise OrdenCerrada("La orden ya está cerrada")

        por_bodega: dict[int, list[LineaMovimiento]] = defaultdict(list)
        for item in orden.items:
            if not item.producto_id:
                continue
            producto = await self.producto_repository.obtener_por_id(
                item.producto_id, tenant.empresa_id, tenant.punto_emision_id
            )
            if producto is None or not producto.aplica_inventario:
                continue
            if not item.bodega_id:
                raise BodegaRequerida(f"{item.descripcion} requiere bodega")
            por_bodega[item.bodega_id].append(
                LineaMovimiento(
                    producto_id=item.producto_id,
                    cantidad=item.cantidad,
                    stock_origen_despues=Decimal("0"),
                    producto_codigo=item.codigo,
                    producto_nombre=item.descripcion,
                )
            )

        for bodega_id, lineas in por_bodega.items():
            codigo = await self._codigo_lote(tenant)
            await self.movimiento_repository.registrar(
                MovimientoInventario(
                    id=None,
                    empresa_id=tenant.empresa_id,
                    punto_emision_id=tenant.punto_emision_id,
                    codigo=codigo,
                    tipo=TipoMovimiento.SALIDA,
                    bodega_id=bodega_id,
                    nota=f"Salida por orden de trabajo {orden.numero}",
                    lineas=lineas,
                )
            )

        orden.estado = EstadoOrden.CERRADA
        orden.fecha_entrega = ahora_ecuador()
        return await self.orden_repository.guardar(orden)

    async def _codigo_lote(self, tenant: ContextoTenant) -> str:
        for _ in range(INTENTOS_CODIGO):
            codigo = generar_codigo_lote()
            existente = await self.movimiento_repository.obtener_por_codigo(
                codigo, tenant.empresa_id, tenant.punto_emision_id
            )
            if existente is None:
                return codigo
        raise ItemInvalido("No se pudo generar el lote de salida")
