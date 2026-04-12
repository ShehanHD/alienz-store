"""Tests for POST /auth/register, /auth/login, /auth/logout, /auth/refresh."""
import pytest

from tests.conftest import register_user, login_user, auth_header


VALID_USER = {
    "email": "alice@example.com",
    "password": "securepassword",
    "first_name": "Alice",
    "last_name": "Smith",
}


def test_register_creates_client_user(client, db):
    r = client.post("/auth/register", json=VALID_USER)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["email"] == "alice@example.com"
    assert body["role"] == "client"
    assert "access_token" in body
    assert "user_id" in body


def test_register_blocked_when_registrations_disabled(client, db):
    with db.cursor() as cur:
        cur.execute("UPDATE site_config SET value = 'false' WHERE key = 'allow_registrations'")
    r = client.post("/auth/register", json=VALID_USER)
    assert r.status_code == 403, r.text


def test_register_duplicate_email_returns_409(client, db):
    register_user(client, email="alice@example.com")
    r = client.post("/auth/register", json=VALID_USER)
    assert r.status_code == 409, r.text


def test_register_invalid_email_returns_422(client, db):
    r = client.post("/auth/register", json={**VALID_USER, "email": "notanemail"})
    assert r.status_code == 422, r.text


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
    r = client.post("/auth/register", json=VALID_USER)
    assert r.status_code == 201, r.text
    # The refresh token is set as a cookie — TestClient stores it automatically
    r2 = client.post("/auth/refresh")
    assert r2.status_code == 200, r2.text
    assert "access_token" in r2.json()


def test_refresh_missing_cookie_returns_401(client, db):
    r = client.post("/auth/refresh")
    assert r.status_code == 401, r.text


def test_logout_returns_200(client, db):
    data = register_user(client, email="alice@example.com", password="securepassword")
    token = data["access_token"]
    r = client.post("/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
