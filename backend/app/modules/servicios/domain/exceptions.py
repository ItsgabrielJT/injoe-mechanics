from app.shared.domain.exceptions import ErrorDeDominio


class ServicioNoEncontrado(ErrorDeDominio):
    def __init__(self, mensaje: str = "Servicio no encontrado") -> None:
        super().__init__(mensaje)


class NombreRequerido(ErrorDeDominio):
    def __init__(self, mensaje: str = "El nombre del servicio es obligatorio") -> None:
        super().__init__(mensaje)


class PrecioInvalido(ErrorDeDominio):
    def __init__(self, mensaje: str = "El precio de venta debe ser mayor a 0") -> None:
        super().__init__(mensaje)


class TipoImpuestoRequerido(ErrorDeDominio):
    def __init__(self, mensaje: str = "El tipo de impuesto es obligatorio") -> None:
        super().__init__(mensaje)


class CodigoDuplicado(ErrorDeDominio):
    def __init__(self, mensaje: str = "El código ya está registrado en este punto de emisión") -> None:
        super().__init__(mensaje)


class CodigoInvalido(ErrorDeDominio):
    def __init__(self, mensaje: str = "El código no puede superar 20 caracteres") -> None:
        super().__init__(mensaje)


class DescripcionExcedida(ErrorDeDominio):
    def __init__(self, mensaje: str = "La descripción no puede superar 500 caracteres") -> None:
        super().__init__(mensaje)


class PesoInvalido(ErrorDeDominio):
    def __init__(self, mensaje: str = "El peso no puede ser negativo") -> None:
        super().__init__(mensaje)
