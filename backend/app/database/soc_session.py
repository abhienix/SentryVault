"""
PostgreSQL session for the sentry_security SOC database.
Separate engine from the MySQL sentryvault app database.
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

SOCBase = declarative_base()

# Build engine — gracefully handle missing psycopg2 or unreachable DB
try:
    soc_engine = create_engine(
        settings.POSTGRES_SOC_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        connect_args={"connect_timeout": 5},
    )
    # Verify connection on startup
    with soc_engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    _soc_db_available = True
    logger.info("[SOC DB] Connected to PostgreSQL sentry_security")
except Exception as e:
    soc_engine = None
    _soc_db_available = False
    logger.warning(f"[SOC DB] PostgreSQL unavailable: {e}. SOC endpoints will return 503.")

SocSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=soc_engine,
) if soc_engine else None


def get_soc_db():
    """FastAPI dependency for PostgreSQL sentry_security sessions."""
    if not _soc_db_available or SocSessionLocal is None:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail="Security Operations Database (PostgreSQL) is currently unavailable."
        )
    db = SocSessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_soc_db_health() -> dict:
    """Used by /health-check endpoint — returns latency & status."""
    import time
    if not soc_engine:
        return {"connected": False, "latency_ms": None, "error": "Engine not initialized"}
    try:
        t0 = time.monotonic()
        with soc_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        latency = round((time.monotonic() - t0) * 1000, 2)
        return {"connected": True, "latency_ms": latency}
    except Exception as e:
        return {"connected": False, "latency_ms": None, "error": str(e)}
