import os
import pytest
from tests.conftest import auth_header

COLLAB_URL = "/collaborators"

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


def make_collab(client, headers, **kwargs):
    payload = {"name": "Brand A", "instagram_url": "https://instagram.com/branda", **kwargs}
    r = client.post(COLLAB_URL, json=payload, headers=headers)
    assert r.status_code == 201
    return r.json()


def test_list_empty(client):
    r = client.get(COLLAB_URL)
    assert r.status_code == 200
    assert r.json() == []


def test_create_collaborator(client):
    token = _owner_token(client)
    headers = auth_header(token)
    data = make_collab(client, headers)
    assert data["name"] == "Brand A"
    assert data["instagram_url"] == "https://instagram.com/branda"
    assert data["is_featured"] is False
    assert data["display_order"] == 0
    assert "id" in data
    assert "created_at" in data


def test_list_returns_created(client):
    token = _owner_token(client)
    headers = auth_header(token)
    make_collab(client, headers, name="Brand B")
    make_collab(client, headers, name="Brand A")
    r = client.get(COLLAB_URL)
    assert r.status_code == 200
    names = [c["name"] for c in r.json()]
    assert names == ["Brand A", "Brand B"]  # ordered by display_order, name


def test_update_collaborator(client):
    token = _owner_token(client)
    headers = auth_header(token)
    collab = make_collab(client, headers)
    r = client.put(
        f"{COLLAB_URL}/{collab['id']}",
        json={"name": "Updated", "instagram_url": "https://instagram.com/updated", "is_featured": True, "display_order": 1},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Updated"
    assert r.json()["is_featured"] is True


def test_delete_collaborator(client):
    token = _owner_token(client)
    headers = auth_header(token)
    collab = make_collab(client, headers)
    r = client.delete(f"{COLLAB_URL}/{collab['id']}", headers=headers)
    assert r.status_code == 204
    assert client.get(COLLAB_URL).json() == []


def test_unauthenticated_blocked(client):
    r = client.post(COLLAB_URL, json={"name": "X", "instagram_url": "https://instagram.com/x"})
    assert r.status_code == 401


def test_reorder(client):
    token = _owner_token(client)
    headers = auth_header(token)
    a = make_collab(client, headers, name="A", display_order=0)
    b = make_collab(client, headers, name="B", display_order=1)
    r = client.patch(
        f"{COLLAB_URL}/reorder",
        json=[{"id": a["id"], "display_order": 10}, {"id": b["id"], "display_order": 0}],
        headers=headers,
    )
    assert r.status_code == 204
    listed = client.get(COLLAB_URL).json()
    assert listed[0]["name"] == "B"
    assert listed[1]["name"] == "A"
