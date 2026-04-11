import os
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


def _create_product(client, token, name="Blue Dress", price="49.99"):
    return client.post("/admin/products", json={
        "name": name,
        "description": "A lovely dress",
        "price": price,
        "sizes": ["S", "M", "L"],
        "colors": ["Blue", "Black"],
        "is_active": True,
    }, headers=auth_header(token)).json()


def test_public_products_returns_only_active(client):
    token = _owner_token(client)
    _create_product(client, token, "Active Dress")
    client.post("/admin/products", json={
        "name": "Draft Dress", "price": "29.99", "is_active": False,
    }, headers=auth_header(token))
    r = client.get("/products")
    assert r.status_code == 200
    names = [p["name"] for p in r.json()["items"]]
    assert "Active Dress" in names
    assert "Draft Dress" not in names


def test_public_product_detail_by_slug(client):
    token = _owner_token(client)
    _create_product(client, token, "Red Blouse")
    r = client.get("/products/red-blouse")
    assert r.status_code == 200
    assert r.json()["name"] == "Red Blouse"


def test_product_detail_404_for_inactive(client):
    token = _owner_token(client)
    client.post("/admin/products", json={
        "name": "Hidden Item", "price": "10.00", "is_active": False,
    }, headers=auth_header(token))
    r = client.get("/products/hidden-item")
    assert r.status_code == 404


def test_max_products_limit_enforced(client, db):
    with db.cursor() as cur:
        cur.execute("UPDATE site_config SET value = '1' WHERE key = 'max_products'")
    token = _owner_token(client)
    _create_product(client, token, "First Product")
    r = client.post("/admin/products", json={
        "name": "Second Product", "price": "20.00",
    }, headers=auth_header(token))
    assert r.status_code == 422


def test_admin_can_update_product(client):
    token = _owner_token(client)
    product = _create_product(client, token)
    r = client.put(f"/admin/products/{product['id']}",
                   json={"name": "Updated Dress", "price": "59.99", "is_active": True,
                         "sizes": ["M"], "colors": ["Red"]},
                   headers=auth_header(token))
    assert r.status_code == 200
    assert r.json()["name"] == "Updated Dress"


def test_admin_can_delete_product(client):
    token = _owner_token(client)
    product = _create_product(client, token)
    r = client.delete(f"/admin/products/{product['id']}", headers=auth_header(token))
    assert r.status_code == 204


def test_filter_by_category(client):
    token = _owner_token(client)
    cat = client.post("/admin/categories", json={"name": "Skirts"},
                      headers=auth_header(token)).json()
    client.post("/admin/products", json={
        "name": "Mini Skirt", "price": "39.99", "is_active": True,
        "category_id": cat["id"],
    }, headers=auth_header(token))
    _create_product(client, token, "Blue Top")
    r = client.get(f"/products?category={cat['slug']}")
    assert len(r.json()["items"]) == 1
    assert r.json()["items"][0]["name"] == "Mini Skirt"
