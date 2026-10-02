from decimal import Decimal

from app.modules.inventario.application.dto import (
    ActualizarProductoCommand,
    ContextoTenant,
    CrearProductoCommand,
    ListarProductosQuery,
)
from app.modules.inventario.application.ports.repositorios import (
    BodegaRepository,
    CategoriaProductoRepository,
    MovimientoInventarioRepository,
    ProductoRepository,
)
from app.modules.inventario.domain.entities import (
    INTENTOS_CODIGO,
    UNIDAD_MAX,
    LineaMovimiento,
    MovimientoInventario,
    Producto,
    TipoMovimiento,
    cantidad_valida,
    codigo_barras_valido,
    codigo_valido,
    descripcion_valida,
    generar_codigo_lote,
    nombre_valido,
    precio_valido,
    stock_minimo_valido,
)
from app.modules.inventario.domain.exceptions import (
    BodegaInactiva,
    BodegaNoEncontrada,
    CantidadInvalida,
    CategoriaInactiva,
    CategoriaNoEncontrada,
    CategoriaRequerida,
    CodigoBarrasDuplicado,
    CodigoBarrasInvalido,
    CodigoDuplicado,
    CodigoRequerido,
    DescripcionExcedida,
    NombreRequerido,
    PrecioInvalido,
    ProductoNoEncontrado,
    RecursoEnUso,
    TipoImpuestoRequerido,
)


class CrearProductoUseCase:
    def __init__(
        self,
        producto_repository: ProductoRepository,
        categoria_repository: CategoriaProductoRepository,
        bodega_repository: BodegaRepository,
        movimiento_repository: MovimientoInventarioRepository,
    ) -> None:
        self.producto_repository = producto_repository
        self.categoria_repository = categoria_repository
        self.bodega_repository = bodega_repository
        self.movimiento_repository = movimiento_repository

    async def execute(self, command: CrearProductoCommand, tenant: ContextoTenant) -> Producto:
        codigo = command.codigo.strip().upper()
        if not codigo_valido(codigo):
            raise CodigoRequerido()
        nombre = command.nombre.strip()
        if not nombre_valido(nombre):
            raise NombreRequerido("El nombre del producto es obligatorio")
        if command.tipo_impuesto is None:
            raise TipoImpuestoRequerido()
        if not precio_valido(Decimal(command.precio_venta)):
            raise PrecioInvalido()
        if not descripcion_valida(command.descripcion):
            raise DescripcionExcedida()
        codigo_barras = command.codigo_barras.strip() if command.codigo_barras else None
        if codigo_barras == "":
            codigo_barras = None
        if not codigo_barras_valido(codigo_barras):
            raise CodigoBarrasInvalido()
        if not stock_minimo_valido(Decimal(command.stock_minimo)):
            raise CantidadInvalida("El stock mínimo no puede ser negativo")

        categoria = await self.categoria_repository.obtener_por_id(
            command.categoria_id, tenant.empresa_id, tenant.punto_emision_id
        )
        if categoria is None:
            raise CategoriaRequerida()
        if not categoria.activo:
            raise CategoriaInactiva()

        duplicado = await self.producto_repository.obtener_por_codigo(codigo, tenant.empresa_id, tenant.punto_emision_id)
        if duplicado:
            raise CodigoDuplicado()
        if codigo_barras:
            duplicado_barras = await self.producto_repository.obtener_por_codigo_barras(
                codigo_barras, tenant.empresa_id, tenant.punto_emision_id
            )
            if duplicado_barras:
                raise CodigoBarrasDuplicado()

        unidad = (command.unidad_medida or "UN").strip()[:UNIDAD_MAX] or "UN"
        producto = await self.producto_repository.guardar(
            Producto(
                id=None,
                empresa_id=tenant.empresa_id,
                punto_emision_id=tenant.punto_emision_id,
                codigo=codigo,
                nombre=nombre,
                categoria_id=command.categoria_id,
                precio_venta=Decimal(command.precio_venta),
                tipo_impuesto=command.tipo_impuesto,
                codigo_barras=codigo_barras,
                descripcion=command.descripcion.strip() if command.descripcion else None,
                aplica_iva=command.aplica_iva,
                aplica_inventario=command.aplica_inventario,
                stock_minimo=Decimal(command.stock_minimo),
                stock_maximo=Decimal(command.stock_maximo) if command.stock_maximo is not None else None,
                unidad_medida=unidad,
                peso=command.peso,
                activo=command.activo,
            )
        )

        if command.aplica_inventario and command.stock_inicial and Decimal(command.stock_inicial.cantidad) > 0:
            await self._registrar_stock_inicial(producto, command, tenant)
            actualizado = await self.producto_repository.obtener_por_id(
                producto.id or 0, tenant.empresa_id, tenant.punto_emision_id
            )
            return actualizado or producto
        return producto

    async def _registrar_stock_inicial(
        self, producto: Producto, command: CrearProductoCommand, tenant: ContextoTenant
    ) -> None:
        assert command.stock_inicial is not None
        if not cantidad_valida(Decimal(command.stock_inicial.cantidad)):
            raise CantidadInvalida()
        bodega = await self.bodega_repository.obtener_por_id(
            command.stock_inicial.bodega_id, tenant.empresa_id, tenant.punto_emision_id
        )
        if bodega is None:
            raise BodegaNoEncontrada()
        if not bodega.activo:
            raise BodegaInactiva()
        codigo_lote = await self._codigo_lote(tenant)
        await self.movimiento_repository.registrar(
            MovimientoInventario(
                id=None,
                empresa_id=tenant.empresa_id,
                punto_emision_id=tenant.punto_emision_id,
                codigo=codigo_lote,
                tipo=TipoMovimiento.STOCK_INICIAL,
                bodega_id=command.stock_inicial.bodega_id,
                nota="Entrada inicial",
                lineas=[
                    LineaMovimiento(
                        producto_id=producto.id or 0,
                        cantidad=Decimal(command.stock_inicial.cantidad),
                        stock_origen_despues=Decimal("0"),
                    )
                ],
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


class ActualizarProductoUseCase:
    def __init__(
        self,
        producto_repository: ProductoRepository,
        categoria_repository: CategoriaProductoRepository,
    ) -> None:
        self.producto_repository = producto_repository
        self.categoria_repository = categoria_repository

    async def execute(self, command: ActualizarProductoCommand, tenant: ContextoTenant) -> Producto:
        producto = await self.producto_repository.obtener_por_id(
            command.producto_id, tenant.empresa_id, tenant.punto_emision_id
        )
        if producto is None:
            raise ProductoNoEncontrado()

        if command.codigo is not None:
            codigo = command.codigo.strip().upper()
            if not codigo_valido(codigo):
                raise CodigoRequerido()
            duplicado = await self.producto_repository.obtener_por_codigo(codigo, tenant.empresa_id, tenant.punto_emision_id)
            if duplicado and duplicado.id != producto.id:
                raise CodigoDuplicado()
            producto.codigo = codigo
        if command.nombre is not None:
            nombre = command.nombre.strip()
            if not nombre_valido(nombre):
                raise NombreRequerido("El nombre del producto es obligatorio")
            producto.nombre = nombre
        if command.categoria_id is not None:
            categoria = await self.categoria_repository.obtener_por_id(
                command.categoria_id, tenant.empresa_id, tenant.punto_emision_id
            )
            if categoria is None:
                raise CategoriaNoEncontrada()
            if not categoria.activo:
                raise CategoriaInactiva()
            producto.categoria_id = command.categoria_id
        if command.precio_venta is not None:
            if not precio_valido(Decimal(command.precio_venta)):
                raise PrecioInvalido()
            producto.precio_venta = Decimal(command.precio_venta)
        if command.tipo_impuesto is not None:
            producto.tipo_impuesto = command.tipo_impuesto
        if command.codigo_barras is not None:
            codigo_barras = command.codigo_barras.strip() or None
            if not codigo_barras_valido(codigo_barras):
                raise CodigoBarrasInvalido()
            if codigo_barras:
                duplicado = await self.producto_repository.obtener_por_codigo_barras(
                    codigo_barras, tenant.empresa_id, tenant.punto_emision_id
                )
                if duplicado and duplicado.id != producto.id:
                    raise CodigoBarrasDuplicado()
            producto.codigo_barras = codigo_barras
        if command.descripcion is not None:
            descripcion = command.descripcion.strip() or None
            if not descripcion_valida(descripcion):
                raise DescripcionExcedida()
            producto.descripcion = descripcion
        if command.aplica_iva is not None:
            producto.aplica_iva = command.aplica_iva
        if command.aplica_inventario is not None:
            producto.aplica_inventario = command.aplica_inventario
        if command.stock_minimo is not None:
            if not stock_minimo_valido(Decimal(command.stock_minimo)):
                raise CantidadInvalida("El stock mínimo no puede ser negativo")
            producto.stock_minimo = Decimal(command.stock_minimo)
        if command.stock_maximo is not None:
            producto.stock_maximo = Decimal(command.stock_maximo)
        if command.unidad_medida is not None:
            producto.unidad_medida = command.unidad_medida.strip()[:UNIDAD_MAX] or "UN"
        if command.peso is not None:
            producto.peso = command.peso
        if command.activo is not None:
            producto.activo = command.activo
        return await self.producto_repository.guardar(producto)


class EliminarProductoUseCase:
    def __init__(self, producto_repository: ProductoRepository) -> None:
        self.producto_repository = producto_repository

    async def execute(self, producto_id: int, tenant: ContextoTenant) -> None:
        producto = await self.producto_repository.obtener_por_id(producto_id, tenant.empresa_id, tenant.punto_emision_id)
        if producto is None:
            raise ProductoNoEncontrado()
        if await self.producto_repository.tiene_movimientos(producto_id):
            raise RecursoEnUso("No se puede eliminar el producto porque tiene movimientos de stock")
        await self.producto_repository.eliminar(producto_id, tenant.empresa_id, tenant.punto_emision_id)


class ObtenerProductoUseCase:
    def __init__(self, producto_repository: ProductoRepository) -> None:
        self.producto_repository = producto_repository

    async def execute(self, producto_id: int, tenant: ContextoTenant) -> Producto:
        producto = await self.producto_repository.obtener_por_id(producto_id, tenant.empresa_id, tenant.punto_emision_id)
        if producto is None:
            raise ProductoNoEncontrado()
        return producto


class ListarProductosUseCase:
    def __init__(self, producto_repository: ProductoRepository) -> None:
        self.producto_repository = producto_repository

    async def execute(self, query: ListarProductosQuery, tenant: ContextoTenant) -> tuple[list[Producto], int]:
        return await self.producto_repository.listar(tenant.empresa_id, tenant.punto_emision_id, query)
