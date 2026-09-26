# app/core/db.py
import logging
from psycopg_pool import ConnectionPool
from app.core.config import settings

logger = logging.getLogger(__name__)

pool: ConnectionPool | None = None

if settings.DATABASE_URL:
    try:
        pool = ConnectionPool(
            conninfo=settings.DATABASE_URL,
            max_size=5,
            max_idle=60,
            kwargs={"autocommit": True, "prepare_threshold": 0},
            check=ConnectionPool.check_connection,
        )
    except Exception as e:
        logger.error(f"DB pool init failed: {e}")
        pool = None
else:
    logger.warning("DATABASE_URL not set — persistence and multi-turn memory disabled")