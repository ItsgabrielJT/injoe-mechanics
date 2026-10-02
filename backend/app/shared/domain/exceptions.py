class ErrorDeDominio(Exception):
    def __init__(self, mensaje: str) -> None:
        super().__init__(mensaje)
        self.mensaje = mensaje


class CredencialesInvalidas(ErrorDeDominio):
    def __init__(self, mensaje: str = "Correo o contraseña incorrectos") -> None:
        super().__init__(mensaje)


class UsuarioInactivo(ErrorDeDominio):
    def __init__(self, mensaje: str = "El usuario está inactivo") -> None:
        super().__init__(mensaje)


class SinPuntosEmision(ErrorDeDominio):
    def __init__(self, mensaje: str = "El usuario no tiene puntos de emisión asignados") -> None:
        super().__init__(mensaje)


class PuntoNoAutorizado(ErrorDeDominio):
    def __init__(self, mensaje: str = "No tienes acceso a este punto de emisión") -> None:
        super().__init__(mensaje)


class TokenInvalido(ErrorDeDominio):
    def __init__(self, mensaje: str = "Token inválido o expirado") -> None:
        super().__init__(mensaje)


class SesionSinContexto(ErrorDeDominio):
    def __init__(self, mensaje: str = "Debes seleccionar un punto de emisión") -> None:
        super().__init__(mensaje)
