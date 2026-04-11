import os
import pytest
from tests.conftest import auth_header

SETUP_PAYLOAD = {
    "email": os.environ.get("ADMIN_EMAIL", "owner@example.com"),
    "password": os.environ.get("ADMIN_PASSWORD", "ownerpassword"),
    "first_name": "Owner",
    "last_name": "User",
}

def _owner_token(client):
    client.post("/setup", json=SETUP_PAYLOAD)
    r = client.post("/auth/login", json={
        "email": SETUP_PAYLOAD["email"],
        "password": SETUP_PAYLOAD["password"],
    })
    return r.json()["access_token"]


def test_public_categories_empty_by_default(client):
    r = client.get("/categories")
    assert r.status_code == 200
    assert r.json() == []


def test_admin_creates_category(client):
    token = _owner_token(client)
    r = client.post("/admin/categories", json={"name": "Dresses", "sort_order": 1},
                    headers=auth_header(token))
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "Dresses"
    assert body["slug"] == "dresses"


def test_duplicate_name_rejected(client):
    token = _owner_token(client)
    client.post("/admin/categories", json={"name": "Tops"}, headers=auth_header(token))
    r = client.post("/admin/categories", json={"name": "Tops"}, headers=auth_header(token))
    assert r.status_code == 409


def test_admin_updates_category(client):
    token = _owner_token(client)
    created = client.post("/admin/categories", json={"name": "Tops"},
                          headers=auth_header(token)).json()
    r = client.put(f"/admin/categories/{created['id']}",
                   json={"name": "Tops & Shirts", "sort_order": 2},
                   headers=auth_header(token))
    assert r.status_code == 200
    assert r.json()["name"] == "Tops & Shirts"
    assert r.json()["slug"] == "tops-shirts"


def test_unauthenticated_cannot_create_category(client):
    r = client.post("/admin/categories", json={"name": "Shoes"})
    assert r.status_code in (401, 403)


@pytest.mark.skip(reason="Non-admin client role not yet buildable in tests — revisit in Task 16")
def test_non_admin_cannot_create_category(client):
    assert False, "Remove skip when client registration is available"


def test_admin_deletes_category(client):
    token = _owner_token(client)
    created = client.post("/admin/categories", json={"name": "Bags"},
                          headers=auth_header(token)).json()
    r = client.delete(f"/admin/categories/{created['id']}", headers=auth_header(token))
    assert r.status_code == 204
    assert client.get("/categories").json() == []
