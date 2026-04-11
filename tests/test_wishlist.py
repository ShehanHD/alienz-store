import os
from tests.conftest import register_user, login_user, auth_header

SETUP_PAYLOAD = {
    "email": os.environ.get("ADMIN_EMAIL", "owner@example.com"),
    "password": os.environ.get("ADMIN_PASSWORD", "ownerpassword"),
    "first_name": "Owner",
    "last_name": "User",
}


def _owner_token(client):
    client.post("/setup", json=SETUP_PAYLOAD)
    r = client.post("/auth/login", json={"email": SETUP_PAYLOAD["email"], "password": SETUP_PAYLOAD["password"]})
    return r.json()["access_token"]


def _create_product(client, token, name="Silk Blouse"):
    return client.post("/admin/products", json={
        "name": name, "price": 69.99, "is_active": True,
    }, headers=auth_header(token)).json()


def test_add_to_wishlist(client):
    owner_token = _owner_token(client)
    product = _create_product(client, owner_token)
    register_user(client, "alice@example.com", "pass1234")
    token = login_user(client, "alice@example.com", "pass1234")
    r = client.post(f"/account/wishlist/{product['id']}", headers=auth_header(token))
    assert r.status_code == 201


def test_list_wishlist(client):
    owner_token = _owner_token(client)
    product = _create_product(client, owner_token)
    register_user(client, "alice@example.com", "pass1234")
    token = login_user(client, "alice@example.com", "pass1234")
    client.post(f"/account/wishlist/{product['id']}", headers=auth_header(token))
    r = client.get("/account/wishlist", headers=auth_header(token))
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_remove_from_wishlist(client):
    owner_token = _owner_token(client)
    product = _create_product(client, owner_token)
    register_user(client, "alice@example.com", "pass1234")
    token = login_user(client, "alice@example.com", "pass1234")
    client.post(f"/account/wishlist/{product['id']}", headers=auth_header(token))
    r = client.delete(f"/account/wishlist/{product['id']}", headers=auth_header(token))
    assert r.status_code == 204
    assert client.get("/account/wishlist", headers=auth_header(token)).json() == []


def test_wishlist_cap_enforced(client, db):
    with db.cursor() as cur:
        cur.execute("UPDATE site_config SET value = '1' WHERE key = 'max_wishlist_items'")
    owner_token = _owner_token(client)
    p1 = _create_product(client, owner_token, name="Product A")
    p2 = _create_product(client, owner_token, name="Product B")
    register_user(client, "alice@example.com", "pass1234")
    token = login_user(client, "alice@example.com", "pass1234")
    client.post(f"/account/wishlist/{p1['id']}", headers=auth_header(token))
    r = client.post(f"/account/wishlist/{p2['id']}", headers=auth_header(token))
    assert r.status_code == 422


def test_duplicate_wishlist_item_rejected(client):
    owner_token = _owner_token(client)
    product = _create_product(client, owner_token)
    register_user(client, "alice@example.com", "pass1234")
    token = login_user(client, "alice@example.com", "pass1234")
    client.post(f"/account/wishlist/{product['id']}", headers=auth_header(token))
    r = client.post(f"/account/wishlist/{product['id']}", headers=auth_header(token))
    assert r.status_code == 409
