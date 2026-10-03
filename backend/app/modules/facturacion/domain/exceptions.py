from app.shared.domain.exceptions import ErrorDeDominio


class FacturaNoEncontrada(ErrorDeDominio):
    def __init__(self, mensaje: str = "Factura no encontrada") -> None:
        super().__init__(mensaje)


class FacturaNoEditable(ErrorDeDominio):
    def __init__(self, mensaje: str = "Solo se pueden editar facturas en borrador") -> None:
        super().__init__(mensaje)


class FacturaSinItems(ErrorDeDominio):
    def __init__(self, mensaje: str = "La factura debe tener al menos un ítem") -> None:
        super().__init__(mensaje)


class CertificadoNoConfigurado(ErrorDeDominio):
    def __init__(self, mensaje: str = "Suba el certificado en Configuración antes de enviar al SRI") -> None:
        super().__init__(mensaje)


class OrdenNoFacturable(ErrorDeDominio):
    def __init__(self, mensaje: str = "Solo se pueden facturar órdenes cerradas") -> None:
        super().__init__(mensaje)


class OrdenYaFacturada(ErrorDeDominio):
    def __init__(self, mensaje: str = "La orden de trabajo ya tiene una factura") -> None:
        super().__init__(mensaje)


class ReceptorInvalido(ErrorDeDominio):
    def __init__(self, mensaje: str = "Debe indicar el cliente o consumidor final") -> None:
        super().__init__(mensaje)


class FormaPagoNoEncontrada(ErrorDeDominio):
    def __init__(self, mensaje: str = "Forma de pago no encontrada") -> None:
        super().__init__(mensaje)


class EnvioSriFallido(ErrorDeDominio):
    def __init__(self, mensaje: str = "No se pudo enviar la factura al SRI") -> None:
        super().__init__(mensaje)
