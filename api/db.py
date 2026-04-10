import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Iterator
from .config import settings


def get_db() -> Iterator[psycopg2.extensions.connection]:
    """FastAPI dependency — yields a psycopg2 connection, commits on success."""
    conn = psycopg2.connect(dsn=settings.database_url, cursor_factory=RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
