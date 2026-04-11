from typing import Any

import psycopg2
import psycopg2.extensions
from psycopg2.extras import RealDictCursor
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from .auth import decode_access_token
from .config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


_401 = {"WWW-Authenticate": "Bearer"}


def _decode_token(token: str = Depends(oauth2_scheme)) -> dict[str, Any]:
    """Validate the Bearer token and return its payload without touching the DB.

    Raising here keeps the 401 clean even when no DB is available.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated", headers=_401)
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Not authenticated", headers=_401)
    user_id: str = payload.get("sub", "")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated", headers=_401)
    return payload


def get_current_user(
    payload: dict[str, Any] = Depends(_decode_token),
) -> dict[str, Any]:
    user_id: str = payload["sub"]
    try:
        conn = psycopg2.connect(dsn=settings.database_url, cursor_factory=RealDictCursor)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, role, first_name, last_name, is_active"
                " FROM users WHERE id = %s",
                (user_id,),
            )
            user = cur.fetchone()
    finally:
        conn.close()

    if user is None or not user["is_active"]:
        raise HTTPException(status_code=401, detail="Not authenticated", headers=_401)

    return dict(user)


def require_admin(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if user["role"] not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


def require_owner(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


def get_config(key: str, conn: psycopg2.extensions.connection) -> str:
    """Read a single site_config value by key."""
    with conn.cursor() as cur:
        cur.execute("SELECT value FROM site_config WHERE key = %s", (key,))
        row = cur.fetchone()
    if row is None:
        raise RuntimeError(f"Missing site_config key: {key}")
    return row["value"]
