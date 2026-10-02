from app.modules.acceso.application.dto import ResultadoSesion, SeleccionarContextoCommand
from app.modules.acceso.application.use_cases.seleccionar_contexto import SeleccionarContextoUseCase


class CambiarPuntoUseCase:
    def __init__(self, seleccionar_contexto: SeleccionarContextoUseCase) -> None:
        self.seleccionar_contexto = seleccionar_contexto

    async def execute(self, command: SeleccionarContextoCommand) -> ResultadoSesion:
        return await self.seleccionar_contexto.execute(command)
