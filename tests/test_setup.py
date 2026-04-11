"""Tests for POST /setup — one-time owner bootstrap endpoint."""
import pytest


VALID_PAYLOAD = {
    "email": "owner@example.com",
    "password": "securepassword",
    "first_name": "Alice",
    "last_name": "Owner",
}


def test_setup_first_call_returns_201(client):
    """First call with valid data returns 201 with user_id and message."""
    r = client.post("/setup", json=VALID_PAYLOAD)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["message"] == "Setup complete"
    assert "user_id" in data
    assert len(data["user_id"]) > 0


def test_setup_second_call_returns_409(client):
    """Second call after setup is complete returns 409 'Setup already completed'."""
    r1 = client.post("/setup", json=VALID_PAYLOAD)
    assert r1.status_code == 201, r1.text

    r2 = client.post("/setup", json={**VALID_PAYLOAD, "email": "other@example.com"})
    assert r2.status_code == 409, r2.text
    assert r2.json()["detail"] == "Setup already completed"


def test_setup_invalid_email_returns_422(client):
    """Email without '@' returns 422."""
    r = client.post("/setup", json={**VALID_PAYLOAD, "email": "notanemail"})
    assert r.status_code == 422, r.text


def test_setup_short_password_returns_422(client):
    """Password shorter than 8 chars returns 422."""
    r = client.post("/setup", json={**VALID_PAYLOAD, "password": "short"})
    assert r.status_code == 422, r.text


def test_setup_second_call_with_invalid_input_returns_409(client):
    """After setup is complete, even an invalid payload must return 409 (not 422)."""
    r1 = client.post("/setup", json=VALID_PAYLOAD)
    assert r1.status_code == 201, r1.text

    r2 = client.post("/setup", json={**VALID_PAYLOAD, "email": "notanemail"})
    assert r2.status_code == 409, r2.text
    assert r2.json()["detail"] == "Setup already completed"


def test_setup_duplicate_email_returns_409(client, db):
    """If the email already exists in the DB (e.g. race condition), returns 409 'Email already registered'."""
    # Directly insert a user with the same email
    cur = db.cursor()
    cur.execute(
        """
        INSERT INTO users (email, hashed_password, role, first_name, last_name)
        VALUES (%s, %s, 'client', 'Pre', 'Existing')
        """,
        (VALID_PAYLOAD["email"], "somehash"),
    )
    cur.close()

    r = client.post("/setup", json=VALID_PAYLOAD)
    assert r.status_code == 409, r.text
    assert r.json()["detail"] == "Email already registered"


def test_maintenance_mode_blocks_public(client, db):
    with db.cursor() as cur:
        cur.execute(
            "UPDATE site_config SET value = 'true' WHERE key = 'maintenance_mode'"
        )
    r = client.get("/shop/some-product")
    assert r.status_code == 503


def test_maintenance_mode_allows_admin(client, db):
    with db.cursor() as cur:
        cur.execute(
            "UPDATE site_config SET value = 'true' WHERE key = 'maintenance_mode'"
        )
    r = client.get("/admin/dashboard")
    # 404 because route not yet registered, but NOT 503
    assert r.status_code != 503
