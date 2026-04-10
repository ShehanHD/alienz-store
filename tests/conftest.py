import os
import pytest
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi.testclient import TestClient

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", os.environ.get("DATABASE_URL", ""))


@pytest.fixture(scope="session", autouse=True)
def apply_schema():
    """Apply migrations once per test session. Skips if no test DB is available."""
    if not TEST_DATABASE_URL:
        pytest.skip("No test DB configured")
    try:
        conn = psycopg2.connect(dsn=TEST_DATABASE_URL)
    except Exception:
        pytest.skip("Cannot connect to test DB")
    conn.autocommit = True
    with open("migrations/001_initial.sql") as f:
        conn.cursor().execute(f.read())
    conn.close()


@pytest.fixture(autouse=True)
def clean_tables(apply_schema):
    """Truncate all data tables before each test."""
    try:
        conn = psycopg2.connect(dsn=TEST_DATABASE_URL)
    except Exception:
        pytest.skip("Cannot connect to test DB")
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("""
        TRUNCATE users, categories, products, product_images,
                 wishlist_items, enquiries, setup_flags RESTART IDENTITY CASCADE
    """)
    cur.execute("DELETE FROM site_config")
    cur.execute("""
        INSERT INTO site_config (key, value) VALUES
            ('max_products','15'),('max_images_per_product','6'),
            ('storage_quota_mb','10240'),('max_upload_size_mb','10'),
            ('image_output_max_width','1200'),('enquiry_email',''),
            ('maintenance_mode','false'),('max_wishlist_items','50'),
            ('allow_registrations','true')
    """)
    conn.close()
    yield


@pytest.fixture
def client():
    from api.index import app
    return TestClient(app, raise_server_exceptions=True)


@pytest.fixture
def db():
    """Raw psycopg2 connection for direct DB assertions in tests."""
    try:
        conn = psycopg2.connect(dsn=TEST_DATABASE_URL, cursor_factory=RealDictCursor)
    except Exception:
        pytest.skip("Cannot connect to test DB")
    conn.autocommit = True
    yield conn
    conn.close()


# ── Helpers ──────────────────────────────────────────────────────────────────

def register_user(client, email="user@example.com", password="pass1234",
                  first_name="Test", last_name="User"):
    r = client.post("/auth/register", json={
        "email": email, "password": password,
        "first_name": first_name, "last_name": last_name,
    })
    assert r.status_code == 201, r.text
    return r.json()


def login_user(client, email="user@example.com", password="pass1234"):
    r = client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
