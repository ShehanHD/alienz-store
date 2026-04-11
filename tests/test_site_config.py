import os

import pytest

from tests.conftest import auth_header

SETUP_PAYLOAD = {
    "email": os.environ.get("ADMIN_EMAIL", "owner@example.com"),
    "password": os.environ.get("ADMIN_PASSWORD", "ownerpassword"),
    "first_name": "Owner",
    "last_name": "Admin",
}


def _owner_token(client):
    client.post("/setup", json=SETUP_PAYLOAD)
    r = client.post("/auth/login", json={
        "email": SETUP_PAYLOAD["email"],
        "password": SETUP_PAYLOAD["password"],
    })
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_owner_can_read_all_config(client):
    token = _owner_token(client)
    r = client.get("/admin/settings", headers=auth_header(token))
    assert r.status_code == 200
    data = r.json()
    assert data["max_products"] == "15"
    assert data["maintenance_mode"] == "false"


def test_owner_can_update_config(client):
    token = _owner_token(client)
    r = client.put("/admin/settings", json={"max_products": "20"},
                   headers=auth_header(token))
    assert r.status_code == 200
    r2 = client.get("/admin/settings", headers=auth_header(token))
    assert r2.json()["max_products"] == "20"


@pytest.mark.skip(reason="Admin promotion not built yet — revisit in Task 16")
def test_admin_cannot_access_settings(client):
    pass


def test_non_owner_cannot_read_config(client):
    r = client.post("/auth/register", json={
        "email": "reader@example.com", "password": "pass1234",
        "first_name": "R", "last_name": "U",
    })
    assert r.status_code == 201, r.text
    token = client.post("/auth/login", json={
        "email": "reader@example.com", "password": "pass1234"
    }).json()["access_token"]
    r = client.get("/admin/settings", headers=auth_header(token))
    assert r.status_code == 403


def test_non_owner_cannot_update_config(client):
    r = client.post("/auth/register", json={
        "email": "user@example.com", "password": "pass1234",
        "first_name": "U", "last_name": "S",
    })
    assert r.status_code == 201, r.text
    token = client.post("/auth/login", json={
        "email": "user@example.com", "password": "pass1234"
    }).json()["access_token"]
    r = client.put("/admin/settings", json={"max_products": "100"},
                   headers=auth_header(token))
    assert r.status_code == 403


def test_invalid_key_returns_422(client):
    token = _owner_token(client)
    r = client.put("/admin/settings", json={"nonexistent_key": "value"},
                   headers=auth_header(token))
    assert r.status_code == 422
