"""Tests for /auth/register, /auth/login, /auth/logout, /auth/refresh,
/auth/confirm-email, /auth/resend-confirmation."""
import pytest
from unittest.mock import patch

from tests.conftest import register_user, login_user, auth_header


VALID_USER = {
    "email": "alice@example.com",
    "password": "securepassword",
    "first_name": "Alice",
    "last_name": "Smith",
    "phone": "555-0100",
}


# ── Registration ──────────────────────────────────────────────────────────────

def test_register_returns_check_email_message(client, db):
    with patch("api.routers.auth.send_email_confirmation"):
        r = client.post("/auth/register", json=VALID_USER)
    assert r.status_code == 201, r.text
    assert "detail" in r.json()
    assert "email" in r.json()["detail"].lower()


def test_register_creates_inactive_user(client, db):
    with patch("api.routers.auth.send_email_confirmation"):
        client.post("/auth/register", json=VALID_USER)
    with db.cursor() as cur:
        cur.execute("SELECT is_active FROM users WHERE email = %s", ("alice@example.com",))
        row = cur.fetchone()
    assert row["is_active"] is False


def test_register_creates_confirmation_token(client, db):
    with patch("api.routers.auth.send_email_confirmation"):
        client.post("/auth/register", json=VALID_USER)
    with db.cursor() as cur:
        cur.execute(
            "SELECT ec.token FROM email_confirmations ec "
            "JOIN users u ON u.id = ec.user_id WHERE u.email = %s",
            ("alice@example.com",),
        )
        row = cur.fetchone()
    assert row is not None
    assert len(row["token"]) == 64  # 32 bytes hex


def test_register_calls_send_email_confirmation(client, db):
    with patch("api.routers.auth.send_email_confirmation") as mock_send:
        client.post("/auth/register", json=VALID_USER)
    mock_send.assert_called_once()
    assert mock_send.call_args[0][0] == "alice@example.com"


def test_register_blocked_when_registrations_disabled(client, db):
    with db.cursor() as cur:
        cur.execute("UPDATE site_config SET value = 'false' WHERE key = 'allow_registrations'")
    with patch("api.routers.auth.send_email_confirmation"):
        r = client.post("/auth/register", json=VALID_USER)
    assert r.status_code == 403, r.text


def test_register_duplicate_email_returns_409(client, db):
    register_user(client, email="alice@example.com")
    with patch("api.routers.auth.send_email_confirmation"):
        r = client.post("/auth/register", json=VALID_USER)
    assert r.status_code == 409, r.text


def test_register_invalid_email_returns_422(client, db):
    r = client.post("/auth/register", json={**VALID_USER, "email": "notanemail"})
    assert r.status_code == 422, r.text


# ── Inactive user cannot log in ───────────────────────────────────────────────

def test_inactive_user_cannot_login(client, db):
    with patch("api.routers.auth.send_email_confirmation"):
        client.post("/auth/register", json=VALID_USER)
    r = client.post("/auth/login", json={"email": "alice@example.com", "password": "securepassword"})
    assert r.status_code == 401, r.text


# ── Login (uses register_user which activates the user) ───────────────────────

def test_login_returns_access_token(client, db):
    register_user(client, email="alice@example.com", password="securepassword")
    r = client.post("/auth/login", json={"email": "alice@example.com", "password": "securepassword"})
    assert r.status_code == 200, r.text
    assert "access_token" in r.json()


def test_login_wrong_password_returns_401(client, db):
    register_user(client, email="alice@example.com", password="correct")
    r = client.post("/auth/login", json={"email": "alice@example.com", "password": "wrong"})
    assert r.status_code == 401, r.text


def test_login_unknown_email_returns_401(client, db):
    r = client.post("/auth/login", json={"email": "nobody@example.com", "password": "secret"})
    assert r.status_code == 401, r.text


def test_refresh_returns_new_access_token(client, db):
    register_user(client, email="alice@example.com", password="securepassword")
    client.post("/auth/login", json={"email": "alice@example.com", "password": "securepassword"})
    r = client.post("/auth/refresh")
    assert r.status_code == 200, r.text
    assert "access_token" in r.json()


def test_refresh_missing_cookie_returns_401(client, db):
    r = client.post("/auth/refresh")
    assert r.status_code == 401, r.text


def test_logout_returns_200(client, db):
    register_user(client, email="alice@example.com", password="securepassword")
    token = login_user(client, email="alice@example.com", password="securepassword")
    r = client.post("/auth/logout", headers=auth_header(token))
    assert r.status_code == 200, r.text


# ── Confirm email ─────────────────────────────────────────────────────────────

def _get_token_for(email: str, db) -> str:
    with db.cursor() as cur:
        cur.execute(
            "SELECT ec.token FROM email_confirmations ec "
            "JOIN users u ON u.id = ec.user_id WHERE u.email = %s "
            "ORDER BY ec.id DESC LIMIT 1",
            (email,),
        )
        return cur.fetchone()["token"]


def test_confirm_email_activates_user(client, db):
    with patch("api.routers.auth.send_email_confirmation"):
        client.post("/auth/register", json=VALID_USER)
    token = _get_token_for("alice@example.com", db)
    r = client.get(f"/auth/confirm-email?token={token}")
    assert r.status_code == 200, r.text
    with db.cursor() as cur:
        cur.execute("SELECT is_active FROM users WHERE email = %s", ("alice@example.com",))
        assert cur.fetchone()["is_active"] is True


def test_confirm_email_marks_token_used(client, db):
    with patch("api.routers.auth.send_email_confirmation"):
        client.post("/auth/register", json=VALID_USER)
    token = _get_token_for("alice@example.com", db)
    client.get(f"/auth/confirm-email?token={token}")
    with db.cursor() as cur:
        cur.execute("SELECT used_at FROM email_confirmations WHERE token = %s", (token,))
        assert cur.fetchone()["used_at"] is not None


def test_confirm_email_already_used_returns_400(client, db):
    with patch("api.routers.auth.send_email_confirmation"):
        client.post("/auth/register", json=VALID_USER)
    token = _get_token_for("alice@example.com", db)
    client.get(f"/auth/confirm-email?token={token}")
    r = client.get(f"/auth/confirm-email?token={token}")
    assert r.status_code == 400, r.text


def test_confirm_email_expired_returns_410(client, db):
    with patch("api.routers.auth.send_email_confirmation"):
        client.post("/auth/register", json=VALID_USER)
    # Force-expire the token
    with db.cursor() as cur:
        cur.execute(
            "UPDATE email_confirmations SET expires_at = NOW() - INTERVAL '1 hour' "
            "WHERE user_id = (SELECT id FROM users WHERE email = %s)",
            ("alice@example.com",),
        )
    token = _get_token_for("alice@example.com", db)
    r = client.get(f"/auth/confirm-email?token={token}")
    assert r.status_code == 410, r.text


def test_confirm_email_invalid_token_returns_400(client, db):
    r = client.get("/auth/confirm-email?token=doesnotexist")
    assert r.status_code == 400, r.text


# ── Resend confirmation ───────────────────────────────────────────────────────

def test_resend_confirmation_always_returns_200(client, db):
    """Never reveals whether the email exists (anti-enumeration)."""
    r = client.post("/auth/resend-confirmation", json={"email": "nobody@example.com"})
    assert r.status_code == 200, r.text


def test_resend_confirmation_sends_new_token(client, db):
    with patch("api.routers.auth.send_email_confirmation"):
        client.post("/auth/register", json=VALID_USER)
    first_token = _get_token_for("alice@example.com", db)

    with patch("api.routers.auth.send_email_confirmation") as mock_send:
        client.post("/auth/resend-confirmation", json={"email": "alice@example.com"})
    mock_send.assert_called_once()

    new_token = _get_token_for("alice@example.com", db)
    assert new_token != first_token
