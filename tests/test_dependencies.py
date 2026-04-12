"""Tests for api/dependencies.py — get_current_user, require_admin, require_owner.

Dependencies are exercised by mounting them on a minimal in-test FastAPI app
because no auth router exists yet (Task 7).
"""
import uuid
from typing import Any

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from api.auth import create_access_token, create_refresh_token, hash_password
from api.dependencies import get_current_user, require_admin, require_owner


# ---------------------------------------------------------------------------
# Minimal test app
# ---------------------------------------------------------------------------

def _make_app() -> FastAPI:
    test_app = FastAPI()

    @test_app.get("/me")
    def me(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        return {"id": str(user["id"]), "role": user["role"]}

    @test_app.get("/admin-only")
    def admin_only(user: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
        return {"role": user["role"]}

    @test_app.get("/owner-only")
    def owner_only(user: dict[str, Any] = Depends(require_owner)) -> dict[str, Any]:
        return {"role": user["role"]}

    return test_app


_app = _make_app()
_test_client = TestClient(_app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _insert_user(db, role: str = "client", is_active: bool = True) -> dict:
    """Insert a user directly and return the row."""
    user_id = str(uuid.uuid4())
    cur = db.cursor()
    cur.execute(
        """
        INSERT INTO users (id, email, hashed_password, role, first_name, last_name, is_active)
        VALUES (%s, %s, %s, %s::user_role, %s, %s, %s)
        RETURNING *
        """,
        (
            user_id,
            f"{user_id}@test.example",
            hash_password("test1234"),
            role,
            "Test",
            "User",
            is_active,
        ),
    )
    return dict(cur.fetchone())


# ---------------------------------------------------------------------------
# get_current_user tests
# ---------------------------------------------------------------------------

class TestGetCurrentUser:
    def test_valid_token_returns_200(self, db):
        user = _insert_user(db, role="client")
        token = create_access_token(user["id"], "client")
        r = _test_client.get("/me", headers=_auth(token))
        assert r.status_code == 200
        assert r.json()["role"] == "client"

    def test_missing_token_returns_401(self):
        r = _test_client.get("/me")
        assert r.status_code == 401

    @pytest.mark.no_db
    def test_invalid_token_returns_401(self):
        r = _test_client.get("/me", headers=_auth("not.a.valid.token"))
        assert r.status_code == 401

    @pytest.mark.no_db
    def test_refresh_token_rejected_as_401(self):
        """Refresh tokens must NOT be accepted by get_current_user."""
        refresh = create_refresh_token(str(uuid.uuid4()))
        r = _test_client.get("/me", headers=_auth(refresh))
        assert r.status_code == 401

    def test_inactive_user_returns_401(self, db):
        user = _insert_user(db, role="client", is_active=False)
        token = create_access_token(user["id"], "client")
        r = _test_client.get("/me", headers=_auth(token))
        assert r.status_code == 401

    def test_nonexistent_user_returns_401(self):
        token = create_access_token(str(uuid.uuid4()), "client")
        r = _test_client.get("/me", headers=_auth(token))
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# require_admin tests
# ---------------------------------------------------------------------------

class TestRequireAdmin:
    def test_admin_role_returns_200(self, db):
        user = _insert_user(db, role="admin")
        token = create_access_token(user["id"], "admin")
        r = _test_client.get("/admin-only", headers=_auth(token))
        assert r.status_code == 200

    def test_owner_role_returns_200(self, db):
        user = _insert_user(db, role="owner")
        token = create_access_token(user["id"], "owner")
        r = _test_client.get("/admin-only", headers=_auth(token))
        assert r.status_code == 200

    def test_client_role_returns_403(self, db):
        user = _insert_user(db, role="client")
        token = create_access_token(user["id"], "client")
        r = _test_client.get("/admin-only", headers=_auth(token))
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# require_owner tests
# ---------------------------------------------------------------------------

class TestRequireOwner:
    def test_owner_role_returns_200(self, db):
        user = _insert_user(db, role="owner")
        token = create_access_token(user["id"], "owner")
        r = _test_client.get("/owner-only", headers=_auth(token))
        assert r.status_code == 200

    def test_admin_role_returns_403(self, db):
        user = _insert_user(db, role="admin")
        token = create_access_token(user["id"], "admin")
        r = _test_client.get("/owner-only", headers=_auth(token))
        assert r.status_code == 403

    def test_client_role_returns_403(self, db):
        user = _insert_user(db, role="client")
        token = create_access_token(user["id"], "client")
        r = _test_client.get("/owner-only", headers=_auth(token))
        assert r.status_code == 403
