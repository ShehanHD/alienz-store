import os
import pytest
import psycopg2
from pathlib import Path
from psycopg2.extras import RealDictCursor
from unittest.mock import patch
from fastapi.testclient import TestClient

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", os.environ.get("DATABASE_URL", ""))

_MIGRATIONS_DIR = Path(__file__).parent.parent / "migrations"


@pytest.fixture(scope="session", autouse=True)
def apply_schema(request):
    """Apply all migrations once per test session."""
    if not TEST_DATABASE_URL:
        return
    try:
        conn = psycopg2.connect(dsn=TEST_DATABASE_URL)
    except Exception:
        return
    try:
        conn.autocommit = True
        cur = conn.cursor()
        for migration in sorted(_MIGRATIONS_DIR.glob("*.sql")):
            cur.execute(migration.read_text())
        cur.close()
    finally:
        conn.close()


@pytest.fixture(autouse=True)
def clean_tables(request, apply_schema):
    if request.node.get_closest_marker("no_db"):
        yield
        return
    try:
        conn = psycopg2.connect(dsn=TEST_DATABASE_URL)
    except Exception:
        pytest.skip("Cannot connect to test DB")
    try:
        conn.autocommit = False
        cur = conn.cursor()
        cur.execute("""
            TRUNCATE users, categories, products, product_images,
                     wishlist_items, enquiries, setup_flags, collaborators,
                     email_confirmations RESTART IDENTITY CASCADE
        """)
        cur.execute("DELETE FROM site_config")
        cur.execute("""
            INSERT INTO site_config (key, value) VALUES
                ('max_products','15'),('max_images_per_product','6'),
                ('storage_quota_mb','10240'),('max_upload_size_mb','10'),
                ('image_output_max_width','1200'),('enquiry_email','admin@example.com'),
                ('maintenance_mode','false'),('max_wishlist_items','50'),
                ('allow_registrations','true')
        """)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    yield


@pytest.fixture
def client():
    from api.index import app
    return TestClient(app, raise_server_exceptions=True)


@pytest.fixture
def db():
    try:
        conn = psycopg2.connect(dsn=TEST_DATABASE_URL, cursor_factory=RealDictCursor)
    except Exception:
        pytest.skip("Cannot connect to test DB")
    conn.autocommit = True
    yield conn
    conn.close()


# ── Helpers ──────────────────────────────────────────────────────────────────

def register_user(client, email: str = "user@example.com", password: str = "pass1234",
                  first_name: str = "Test", last_name: str = "User", phone: str = "555-0100") -> dict:
    """Register a user and immediately activate them (bypasses email confirmation for tests)."""
    with patch("api.routers.auth.send_email_confirmation"):
        r = client.post("/auth/register", json={
            "email": email, "password": password,
            "first_name": first_name, "last_name": last_name, "phone": phone,
        })
    assert r.status_code == 201, r.text
    # Activate the user directly so tests can log in immediately
    if TEST_DATABASE_URL:
        conn = psycopg2.connect(dsn=TEST_DATABASE_URL)
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET is_active = TRUE WHERE email = %s", (email,))
        conn.close()
    return r.json()


def login_user(client, email: str = "user@example.com", password: str = "pass1234") -> str:
    r = client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
