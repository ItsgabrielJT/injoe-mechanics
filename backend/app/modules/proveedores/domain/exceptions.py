from app.shared.domain.exceptions import ErrorDeDominio


class ProveedorNoEncontrado(ErrorDeDominio):
    def __init__(self, mensaje: str = "Proveedor no encontrado") -> None:
        super().__init__(mensaje)


class IdentificacionRequerida(ErrorDeDominio):
    def __init__(self, mensaje: str = "El RUC o cédula es obligatorio") -> None:
        super().__init__(mensaje)


class IdentificacionInvalida(ErrorDeDominio):
    def __init__(self, mensaje: str = "La identificación debe tener 10 dígitos (cédula) o 13 dígitos (RUC)") -> None:
        super().__init__(mensaje)


class IdentificacionDuplicada(ErrorDeDominio):
    def __init__(self, mensaje: str = "La identificación ya está registrada en este punto de emisión") -> None:
        super().__init__(mensaje)


class NombreRequerido(ErrorDeDominio):
    def __init__(self, mensaje: str = "El nombre del proveedor es obligatorio") -> None:
        super().__init__(mensaje)


class PrecioCompraInvalido(ErrorDeDominio):
    def __init__(self, mensaje: str = "El precio de compra no puede ser negativo") -> None:
        super().__init__(mensaje)


class RelacionNoEncontrada(ErrorDeDominio):
    def __init__(self, mensaje: str = "No existe esa relación con el proveedor") -> None:
        super().__init__(mensaje)


class RelacionDuplicada(ErrorDeDominio):
    def __init__(self, mensaje: str = "Ese proveedor ya está asociado") -> None:
        super().__init__(mensaje)


class RecursoEnUso(ErrorDeDominio):
    def __init__(self, mensaje: str = "No se puede eliminar porque tiene registros asociados") -> None:
        super().__init__(mensaje)
