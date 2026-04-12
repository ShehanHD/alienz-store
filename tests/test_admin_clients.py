import os

from tests.conftest import register_user, auth_header


def _owner_token(client):
    client.post("/setup")
    return client.post("/auth/login", json={
        "email": os.environ.get("ADMIN_EMAIL", "owner@example.com"),
        "password": os.environ.get("ADMIN_PASSWORD", "ownerpass123"),
    }).json()["access_token"]


def test_admin_lists_clients(client):
    register_user(client, "alice@example.com", "pass1234")
    register_user(client, "bob@example.com", "pass1234", "Bob", "Jones")
    token = _owner_token(client)
    r = client.get("/admin/clients", headers=auth_header(token))
    assert r.status_code == 200
    emails = [u["email"] for u in r.json()["items"]]
    assert "alice@example.com" in emails


def test_admin_disables_client(client, db):
    register_user(client, "alice@example.com", "pass1234")
    token = _owner_token(client)
    r = client.get("/admin/clients", headers=auth_header(token))
    alice = next(u for u in r.json()["items"] if u["email"] == "alice@example.com")
    r2 = client.put(f"/admin/clients/{alice['id']}/disable", headers=auth_header(token))
    assert r2.status_code == 200
    with db.cursor() as cur:
        cur.execute("SELECT is_active FROM users WHERE id = %s", (alice["id"],))
        assert cur.fetchone()["is_active"] is False


def test_admin_promotes_client_to_admin(client, db):
    register_user(client, "alice@example.com", "pass1234")
    token = _owner_token(client)
    r = client.get("/admin/clients", headers=auth_header(token))
    alice = next(u for u in r.json()["items"] if u["email"] == "alice@example.com")
    r2 = client.put(f"/admin/clients/{alice['id']}/promote", headers=auth_header(token))
    assert r2.status_code == 200
    with db.cursor() as cur:
        cur.execute("SELECT role FROM users WHERE id = %s", (alice["id"],))
        assert cur.fetchone()["role"] == "admin"


def test_owner_cannot_be_promoted_to_admin(client, db):
    token = _owner_token(client)
    owner_email = os.environ.get("ADMIN_EMAIL", "owner@example.com")
    with db.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (owner_email,))
        owner_id = cur.fetchone()["id"]
    r = client.put(f"/admin/clients/{owner_id}/promote", headers=auth_header(token))
    assert r.status_code == 422


def test_admin_deletes_client(client, db):
    register_user(client, "alice@example.com", "pass1234")
    token = _owner_token(client)
    r = client.get("/admin/clients", headers=auth_header(token))
    alice = next(u for u in r.json()["items"] if u["email"] == "alice@example.com")
    r2 = client.delete(f"/admin/clients/{alice['id']}", headers=auth_header(token))
    assert r2.status_code == 204
