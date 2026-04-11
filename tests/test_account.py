from tests.conftest import register_user, login_user, auth_header


def test_get_own_profile(client):
    register_user(client, "alice@example.com", "pass1234", "Alice", "Smith")
    token = login_user(client, "alice@example.com", "pass1234")
    r = client.get("/account/profile", headers=auth_header(token))
    assert r.status_code == 200
    assert r.json()["email"] == "alice@example.com"
    assert r.json()["first_name"] == "Alice"


def test_update_profile(client):
    register_user(client, "alice@example.com", "pass1234")
    token = login_user(client, "alice@example.com", "pass1234")
    r = client.put("/account/profile", json={"first_name": "Alicia", "last_name": "Brown"},
                   headers=auth_header(token))
    assert r.status_code == 200
    assert r.json()["first_name"] == "Alicia"


def test_change_password(client):
    register_user(client, "alice@example.com", "oldpass")
    token = login_user(client, "alice@example.com", "oldpass")
    r = client.post("/account/change-password",
                    json={"current_password": "oldpass", "new_password": "newpass123"},
                    headers=auth_header(token))
    assert r.status_code == 200
    # Old password no longer works
    r2 = client.post("/auth/login", json={"email": "alice@example.com", "password": "oldpass"})
    assert r2.status_code == 401


def test_save_address(client):
    register_user(client, "alice@example.com", "pass1234")
    token = login_user(client, "alice@example.com", "pass1234")
    r = client.put("/account/address", json={
        "street": "123 Main St", "city": "London",
        "country": "UK", "postal_code": "SW1A 1AA",
    }, headers=auth_header(token))
    assert r.status_code == 200
    assert r.json()["city"] == "London"


def test_get_address(client):
    register_user(client, "alice@example.com", "pass1234")
    token = login_user(client, "alice@example.com", "pass1234")
    client.put("/account/address", json={
        "street": "10 Downing St", "city": "London",
        "country": "UK", "postal_code": "SW1A 2AA",
    }, headers=auth_header(token))
    r = client.get("/account/address", headers=auth_header(token))
    assert r.status_code == 200
    assert r.json()["street"] == "10 Downing St"
