from app.modules.configuracion.application.dto import ActualizarEmpresaCommand, ActualizarSriIdCommand
from app.modules.configuracion.application.ports.repositorios import EmpresaConfigRepository
from app.modules.configuracion.domain.entities import EmpresaConfig
from app.modules.configuracion.domain.exceptions import DatosEmpresaInvalidos, EmpresaNoEncontrada


class ObtenerEmpresaUseCase:
    def __init__(self, repository: EmpresaConfigRepository) -> None:
        self.repository = repository

    async def execute(self, empresa_id: int) -> EmpresaConfig:
        empresa = await self.repository.obtener(empresa_id)
        if empresa is None:
            raise EmpresaNoEncontrada()
        return empresa


class ActualizarEmpresaUseCase:
    def __init__(self, repository: EmpresaConfigRepository) -> None:
        self.repository = repository

    async def execute(self, command: ActualizarEmpresaCommand, empresa_id: int) -> EmpresaConfig:
        empresa = await self.repository.obtener(empresa_id)
        if empresa is None:
            raise EmpresaNoEncontrada()
        ruc = command.ruc.strip()
        if not ruc.isdigit() or len(ruc) != 13:
            raise DatosEmpresaInvalidos("El RUC debe tener 13 dígitos")
        if len(command.nombre.strip()) < 2:
            raise DatosEmpresaInvalidos("El nombre de la empresa es obligatorio")
        if command.entorno_sri not in {"1", "2"}:
            raise DatosEmpresaInvalidos("El entorno SRI debe ser 1 (pruebas) o 2 (producción)")
        empresa.nombre = command.nombre.strip()
        empresa.ruc = ruc
        empresa.direccion = command.direccion.strip()
        empresa.telefono = command.telefono.strip() if command.telefono else None
        empresa.correo = command.correo.strip() if command.correo else None
        empresa.entorno_sri = command.entorno_sri
        return await self.repository.actualizar(empresa)


class ActualizarSriIdUseCase:
    def __init__(self, repository: EmpresaConfigRepository) -> None:
        self.repository = repository

    async def execute(self, command: ActualizarSriIdCommand, empresa_id: int) -> EmpresaConfig:
        empresa = await self.repository.obtener(empresa_id)
        if empresa is None:
            raise EmpresaNoEncontrada()
        if command.sri_id < 1:
            raise DatosEmpresaInvalidos("El sri_id no es válido")
        empresa.sri_id = command.sri_id
        return await self.repository.actualizar(empresa)
