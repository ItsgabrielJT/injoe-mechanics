from app.shared.domain.exceptions import ErrorDeDominio


class EmpresaNoEncontrada(ErrorDeDominio):
    def __init__(self, mensaje: str = "Empresa no encontrada") -> None:
        super().__init__(mensaje)


class PuntoNoEncontrado(ErrorDeDominio):
    def __init__(self, mensaje: str = "Punto de emisión no encontrado") -> None:
        super().__init__(mensaje)


class PuntoDuplicado(ErrorDeDominio):
    def __init__(self, mensaje: str = "Ya existe un punto de emisión con ese código") -> None:
        super().__init__(mensaje)


class PuntoEnUso(ErrorDeDominio):
    def __init__(self, mensaje: str = "No se puede eliminar el punto porque tiene información asociada") -> None:
        super().__init__(mensaje)


class DatosEmpresaInvalidos(ErrorDeDominio):
    def __init__(self, mensaje: str = "Los datos de la empresa no son válidos") -> None:
        super().__init__(mensaje)
