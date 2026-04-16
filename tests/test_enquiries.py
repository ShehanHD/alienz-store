import os
from unittest.mock import patch
from tests.conftest import auth_header, register_user, login_user

SETUP_PAYLOAD = {
    "email": os.environ.get("ADMIN_EMAIL", "owner@example.com"),
    "password": os.environ.get("ADMIN_PASSWORD", "ownerpassword"),
    "first_name": "Owner",
    "last_name": "User",
    "phone": "555-0000",
}


def _owner_token(client):
    client.post("/setup", json=SETUP_PAYLOAD)
    r = client.post("/auth/login", json={
        "email": SETUP_PAYLOAD["email"],
        "password": SETUP_PAYLOAD["password"],
    })
    return r.json()["access_token"]


def test_guest_can_submit_enquiry(client):
    with patch("api.routers.enquiries.send_enquiry_notification"), \
         patch("api.routers.enquiries.send_enquiry_confirmation"):
        r = client.post("/enquiries", json={
            "name": "Jane", "email": "jane@example.com",
            "message": "Do you have this in size 10?",
        })
    assert r.status_code == 201
    assert r.json()["status"] == "new"


def test_enquiry_sends_admin_notification(client):
    with patch("api.routers.enquiries.send_enquiry_notification") as mock_notify, \
         patch("api.routers.enquiries.send_enquiry_confirmation"):
        client.post("/enquiries", json={
            "name": "Jane", "email": "jane@example.com", "message": "Hello",
        })
    mock_notify.assert_called_once()
    enquiry_arg = mock_notify.call_args[0][0]
    assert enquiry_arg["name"] == "Jane"


def test_enquiry_sends_customer_confirmation(client):
    with patch("api.routers.enquiries.send_enquiry_notification"), \
         patch("api.routers.enquiries.send_enquiry_confirmation") as mock_confirm:
        client.post("/enquiries", json={
            "name": "Jane", "email": "jane@example.com", "message": "Hello",
        })
    mock_confirm.assert_called_once()
    enquiry_arg = mock_confirm.call_args[0][0]
    assert enquiry_arg["email"] == "jane@example.com"


def test_smtp_failure_does_not_break_enquiry_submission(client):
    """Enquiry is saved even if SMTP throws."""
    with patch("api.routers.enquiries.send_enquiry_notification", side_effect=Exception("SMTP down")), \
         patch("api.routers.enquiries.send_enquiry_confirmation", side_effect=Exception("SMTP down")):
        r = client.post("/enquiries", json={
            "name": "Jane", "email": "jane@example.com", "message": "Hello",
        })
    assert r.status_code == 201


def test_admin_can_list_enquiries(client):
    with patch("api.routers.enquiries.send_enquiry_notification"), \
         patch("api.routers.enquiries.send_enquiry_confirmation"):
        client.post("/enquiries", json={
            "name": "Jane", "email": "jane@example.com", "message": "Hello",
        })
    token = _owner_token(client)
    r = client.get("/admin/enquiries", headers=auth_header(token))
    assert r.status_code == 200
    assert len(r.json()["items"]) == 1


def test_admin_can_update_enquiry_status(client):
    with patch("api.routers.enquiries.send_enquiry_notification"), \
         patch("api.routers.enquiries.send_enquiry_confirmation"):
        r = client.post("/enquiries", json={
            "name": "Jane", "email": "jane@example.com", "message": "Hi",
        })
    enquiry_id = r.json()["id"]
    token = _owner_token(client)
    r2 = client.put(f"/admin/enquiries/{enquiry_id}",
                    json={"status": "replied"},
                    headers=auth_header(token))
    assert r2.status_code == 200
    assert r2.json()["status"] == "replied"


def test_logged_in_user_enquiry_links_to_account(client):
    register_user(client, "alice@example.com", "pass1234")
    token = login_user(client, "alice@example.com", "pass1234")
    with patch("api.routers.enquiries.send_enquiry_notification"), \
         patch("api.routers.enquiries.send_enquiry_confirmation"):
        r = client.post("/enquiries", json={
            "name": "Alice", "email": "alice@example.com", "message": "Stock query",
        }, headers=auth_header(token))
    assert r.status_code == 201
    assert r.json()["user_id"] is not None
