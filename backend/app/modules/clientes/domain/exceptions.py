from app.shared.domain.exceptions import ErrorDeDominio


class ClienteNoEncontrado(ErrorDeDominio):
    def __init__(self, mensaje: str = "Cliente no encontrado") -> None:
        super().__init__(mensaje)


class IdentificacionDuplicada(ErrorDeDominio):
    def __init__(self, mensaje: str = "La identificación ya está registrada en este punto de emisión") -> None:
        super().__init__(mensaje)


class IdentificacionInvalida(ErrorDeDominio):
    def __init__(self, mensaje: str = "La identificación debe tener 10 dígitos (cédula) o 13 dígitos (RUC)") -> None:
        super().__init__(mensaje)


class CorreoRequerido(ErrorDeDominio):
    def __init__(self, mensaje: str = "Debe registrar al menos un correo válido") -> None:
        super().__init__(mensaje)


class NombresRequeridos(ErrorDeDominio):
    def __init__(self, mensaje: str = "Los nombres son obligatorios") -> None:
        super().__init__(mensaje)


class VehiculoNoEncontrado(ErrorDeDominio):
    def __init__(self, mensaje: str = "Vehículo no encontrado") -> None:
        super().__init__(mensaje)


class PlacaDuplicada(ErrorDeDominio):
    def __init__(self, mensaje: str = "La placa ya está registrada en este punto de emisión") -> None:
        super().__init__(mensaje)


class PlacaRequerida(ErrorDeDominio):
    def __init__(self, mensaje: str = "La placa es obligatoria") -> None:
        super().__init__(mensaje)


class TransferenciaInvalida(ErrorDeDominio):
    def __init__(self, mensaje: str = "La transferencia de vehículos no es válida") -> None:
        super().__init__(mensaje)
