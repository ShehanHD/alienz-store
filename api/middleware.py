import asyncio

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import psycopg2
import psycopg2.extras
from .config import settings

# Paths that bypass maintenance mode
BYPASS_PREFIXES = ("/auth/login", "/auth/refresh", "/admin", "/setup", "/health")


class MaintenanceModeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Admin, auth, and health routes always bypass
        if any(path.startswith(p) for p in BYPASS_PREFIXES):
            return await call_next(request)

        try:
            loop = asyncio.get_running_loop()
            maintenance = await loop.run_in_executor(None, self._check_maintenance)
            if maintenance:
                return JSONResponse(
                    status_code=503,
                    content={"detail": "Site is under maintenance. Please check back soon."},
                )
        except Exception:
            pass  # If DB is unreachable, don't block the request

        return await call_next(request)

    def _check_maintenance(self) -> bool:
        """Synchronous helper — runs in executor to avoid blocking event loop."""
        conn = psycopg2.connect(
            dsn=settings.database_url,
            cursor_factory=psycopg2.extras.RealDictCursor,
        )
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT value FROM site_config WHERE key = 'maintenance_mode'")
                row = cur.fetchone()
            return bool(row and row["value"] == "true")
        finally:
            conn.close()
