from app.shared.domain.exceptions import ErrorDeDominio


class CategoriaNoEncontrada(ErrorDeDominio):
    def __init__(self, mensaje: str = "Categoría no encontrada") -> None:
        super().__init__(mensaje)


class BodegaNoEncontrada(ErrorDeDominio):
    def __init__(self, mensaje: str = "Bodega no encontrada") -> None:
        super().__init__(mensaje)


class ProductoNoEncontrado(ErrorDeDominio):
    def __init__(self, mensaje: str = "Producto no encontrado") -> None:
        super().__init__(mensaje)


class MovimientoNoEncontrado(ErrorDeDominio):
    def __init__(self, mensaje: str = "Movimiento no encontrado") -> None:
        super().__init__(mensaje)


class NombreRequerido(ErrorDeDominio):
    def __init__(self, mensaje: str = "El nombre es obligatorio") -> None:
        super().__init__(mensaje)


class NombreDuplicado(ErrorDeDominio):
    def __init__(self, mensaje: str = "Ya existe un registro con ese nombre en este punto") -> None:
        super().__init__(mensaje)


class CodigoRequerido(ErrorDeDominio):
    def __init__(self, mensaje: str = "El código del producto es obligatorio") -> None:
        super().__init__(mensaje)


class CodigoDuplicado(ErrorDeDominio):
    def __init__(self, mensaje: str = "El código ya está registrado en este punto de emisión") -> None:
        super().__init__(mensaje)


class CodigoBarrasDuplicado(ErrorDeDominio):
    def __init__(self, mensaje: str = "El código de barras ya está registrado en este punto de emisión") -> None:
        super().__init__(mensaje)


class CodigoBarrasInvalido(ErrorDeDominio):
    def __init__(self, mensaje: str = "El código de barras debe ser alfanumérico") -> None:
        super().__init__(mensaje)


class PrecioInvalido(ErrorDeDominio):
    def __init__(self, mensaje: str = "El precio de venta debe ser mayor a 0") -> None:
        super().__init__(mensaje)


class TipoImpuestoRequerido(ErrorDeDominio):
    def __init__(self, mensaje: str = "El tipo de impuesto es obligatorio") -> None:
        super().__init__(mensaje)


class CategoriaRequerida(ErrorDeDominio):
    def __init__(self, mensaje: str = "Debes asignar una categoría creada") -> None:
        super().__init__(mensaje)


class CategoriaInactiva(ErrorDeDominio):
    def __init__(self, mensaje: str = "La categoría seleccionada no está activa") -> None:
        super().__init__(mensaje)


class BodegaInactiva(ErrorDeDominio):
    def __init__(self, mensaje: str = "La bodega seleccionada no está activa") -> None:
        super().__init__(mensaje)


class CantidadInvalida(ErrorDeDominio):
    def __init__(self, mensaje: str = "La cantidad debe ser mayor a 0") -> None:
        super().__init__(mensaje)


class StockInsuficiente(ErrorDeDominio):
    def __init__(self, mensaje: str = "No hay suficiente stock en la bodega") -> None:
        super().__init__(mensaje)


class BodegaDestinoRequerida(ErrorDeDominio):
    def __init__(self, mensaje: str = "La transferencia requiere una bodega destino distinta") -> None:
        super().__init__(mensaje)


class TipoAjusteRequerido(ErrorDeDominio):
    def __init__(self, mensaje: str = "El ajuste requiere tipo ingreso o egreso") -> None:
        super().__init__(mensaje)


class ItemsRequeridos(ErrorDeDominio):
    def __init__(self, mensaje: str = "Debes agregar al menos un producto") -> None:
        super().__init__(mensaje)


class ProductoSinInventario(ErrorDeDominio):
    def __init__(self, mensaje: str = "Este producto no aplica inventario") -> None:
        super().__init__(mensaje)


class RecursoEnUso(ErrorDeDominio):
    def __init__(self, mensaje: str = "No se puede eliminar porque tiene registros asociados") -> None:
        super().__init__(mensaje)


class DescripcionExcedida(ErrorDeDominio):
    def __init__(self, mensaje: str = "La descripción no puede superar 500 caracteres") -> None:
        super().__init__(mensaje)
