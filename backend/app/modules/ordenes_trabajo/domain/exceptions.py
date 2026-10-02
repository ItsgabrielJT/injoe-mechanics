from app.shared.domain.exceptions import ErrorDeDominio


class OrdenNoEncontrada(ErrorDeDominio):
    def __init__(self, mensaje: str = "Orden de trabajo no encontrada") -> None:
        super().__init__(mensaje)


class OrdenCerrada(ErrorDeDominio):
    def __init__(self, mensaje: str = "La orden cerrada no se puede modificar") -> None:
        super().__init__(mensaje)


class TecnicoNoEncontrado(ErrorDeDominio):
    def __init__(self, mensaje: str = "El técnico no está disponible en este punto") -> None:
        super().__init__(mensaje)


class VehiculoNoPertenece(ErrorDeDominio):
    def __init__(self, mensaje: str = "El vehículo no pertenece al cliente seleccionado") -> None:
        super().__init__(mensaje)


class ItemInvalido(ErrorDeDominio):
    def __init__(self, mensaje: str = "El ítem de la orden no es válido") -> None:
        super().__init__(mensaje)


class BodegaRequerida(ErrorDeDominio):
    def __init__(self, mensaje: str = "Debes elegir una bodega para el producto con inventario") -> None:
        super().__init__(mensaje)


class ProveedorRequerido(ErrorDeDominio):
    def __init__(self, mensaje: str = "Debes seleccionar el proveedor y el costo de compra") -> None:
        super().__init__(mensaje)
