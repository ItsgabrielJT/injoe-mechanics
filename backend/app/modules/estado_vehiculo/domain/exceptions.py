from app.shared.domain.exceptions import ErrorDeDominio


class HistorialVehiculoNoEncontrado(ErrorDeDominio):
    def __init__(self, mensaje: str = "No hay historial de trabajo para este vehículo") -> None:
        super().__init__(mensaje)
