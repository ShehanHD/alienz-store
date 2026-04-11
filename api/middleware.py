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
            conn = psycopg2.connect(
                dsn=settings.database_url,
                cursor_factory=psycopg2.extras.RealDictCursor,
            )
            cur = conn.cursor()
            cur.execute("SELECT value FROM site_config WHERE key = 'maintenance_mode'")
            row = cur.fetchone()
            conn.close()

            if row and row["value"] == "true":
                return JSONResponse(
                    status_code=503,
                    content={"detail": "Site is under maintenance. Please check back soon."},
                )
        except Exception:
            pass  # If DB is unreachable, don't block the request

        return await call_next(request)
