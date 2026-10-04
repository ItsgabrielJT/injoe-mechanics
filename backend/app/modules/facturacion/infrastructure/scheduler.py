import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import settings
from app.core.database import SessionLocal
from app.modules.facturacion.application.use_cases.gestionar_facturas import ReintentarSriUseCase
from app.modules.facturacion.infrastructure.persistence.repositories import SqlAlchemyFacturaRepository
from app.modules.inventario.infrastructure.persistence.repositories import (
    SqlAlchemyMovimientoRepository,
    SqlAlchemyProductoRepository,
)

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def reintentar_facturas_sri() -> None:
    async with SessionLocal() as session:
        repo = SqlAlchemyFacturaRepository(session)
        use_case = ReintentarSriUseCase(
            repo,
            SqlAlchemyProductoRepository(session),
            SqlAlchemyMovimientoRepository(session),
        )
        pendientes = await repo.listar_pendientes_reintento()
        for factura_id, empresa_id, punto_id in pendientes:
            try:
                await use_case.execute(factura_id, empresa_id, punto_id)
            except Exception as exc:
                logger.warning("Reintento SRI falló para factura %s: %s", factura_id, exc)


def iniciar_scheduler() -> None:
    if scheduler.running:
        return
    segundos = max(30, int(settings.SRI_RETRY_INTERVAL_SECONDS))
    scheduler.add_job(reintentar_facturas_sri, "interval", seconds=segundos, id="sri_retry", replace_existing=True)
    scheduler.start()
    logger.info("Job SRI configurado cada %s segundos", segundos)


def detener_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
