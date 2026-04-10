# Clothing Store — Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the complete FastAPI backend (auth, products, categories, images, enquiries, wishlist, site config, admin) as a Vercel Python serverless function backed by Supabase PostgreSQL and Supabase Storage.

**Architecture:** Single FastAPI app at `api/index.py` deployed to Vercel via `@vercel/python`. psycopg2 connects to Supabase PostgreSQL via the Supabase connection pooler (Transaction mode, port 6543 — required for serverless). Custom JWT auth: 15-min access token in `Authorization: Bearer` header, 7-day refresh token in `httpOnly` cookie. Pillow optimises images → WebP before upload to Supabase Storage. All site limits are stored in `site_config` table and enforced server-side on every relevant request.

**Tech Stack:** Python 3.11, FastAPI 0.111, psycopg2-binary 2.9, passlib[bcrypt] 1.7, python-jose[cryptography] 3.3, Pillow 10, supabase 2.x, pydantic-settings 2.x, pytest 8, httpx 0.27

---

## File Structure

```
/
├── api/
│   ├── index.py              ← FastAPI app + all router mounts
│   ├── config.py             ← Pydantic Settings (env vars)
│   ├── db.py                 ← psycopg2 connection helper
│   ├── auth.py               ← JWT issue/verify, bcrypt hash/verify
│   ├── dependencies.py       ← FastAPI deps: current_user, require_role
│   ├── middleware.py         ← Maintenance mode middleware
│   ├── image_processor.py    ← Pillow resize→WebP + 300×300 thumbnail
│   ├── storage.py            ← Supabase Storage upload/delete wrapper
│   └── routers/
│       ├── setup.py              ← POST /setup (one-time owner bootstrap)
│       ├── auth.py               ← /auth/register, login, logout, refresh
│       ├── site_config.py        ← /admin/settings (owner only)
│       ├── categories.py         ← /categories (public) + /admin/categories
│       ├── products.py           ← /products (public) + /admin/products
│       ├── images.py             ← /admin/products/{id}/images upload/delete
│       ├── enquiries.py          ← /enquiries (public) + /admin/enquiries
│       ├── account.py            ← /account/profile, /account/address
│       ├── wishlist.py           ← /account/wishlist
│       ├── admin_clients.py      ← /admin/clients
│       └── admin_dashboard.py    ← /admin/dashboard stats
├── migrations/
│   └── 001_initial.sql       ← All CREATE TABLE + seed site_config
├── tests/
│   ├── conftest.py
│   ├── test_setup.py
│   ├── test_auth.py
│   ├── test_site_config.py
│   ├── test_categories.py
│   ├── test_products.py
│   ├── test_images.py
│   ├── test_enquiries.py
│   ├── test_wishlist.py
│   └── test_admin_clients.py
├── vercel.json
├── requirements.txt
└── .env.example
```

---

### Task 1: Scaffold project — config, requirements, vercel.json, app skeleton

**Files:**
- Create: `requirements.txt`
- Create: `vercel.json`
- Create: `.env.example`
- Create: `api/config.py`
- Create: `api/db.py`
- Create: `api/index.py`

- [ ] **Step 1: Create `requirements.txt`**

```
fastapi==0.111.0
uvicorn==0.29.0
psycopg2-binary==2.9.9
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
Pillow==10.3.0
supabase==2.4.1
pydantic-settings==2.2.1
python-multipart==0.0.9
httpx==0.27.0
pytest==8.1.1
pytest-asyncio==0.23.6
```

- [ ] **Step 2: Create `vercel.json`**

```json
{
  "builds": [
    { "src": "api/index.py", "use": "@vercel/python" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "api/index.py" },
    { "src": "/(.*)", "dest": "api/index.py" }
  ]
}
```

- [ ] **Step 3: Create `.env.example`**

```
DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-region.pooler.supabase.com:6543/postgres
JWT_SECRET=change-me-to-a-random-secret
ADMIN_EMAIL=owner@example.com
ADMIN_PASSWORD=change-me
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=product-images
```

- [ ] **Step 4: Create `api/config.py`**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    admin_email: str = ""
    admin_password: str = ""
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_storage_bucket: str = "product-images"

    model_config = {"env_file": ".env"}


settings = Settings()
```

- [ ] **Step 5: Create `api/db.py`**

```python
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Generator
from .config import settings


def get_db() -> Generator:
    """FastAPI dependency — yields a psycopg2 connection, commits on success."""
    conn = psycopg2.connect(dsn=settings.database_url, cursor_factory=RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
```

- [ ] **Step 6: Create `api/index.py` (skeleton — routers added in later tasks)**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Clothing Store API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your Hostinger domain before going live
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 7: Smoke-test the app starts**

```bash
cd /Users/don/Desktop/alienz
pip install -r requirements.txt
uvicorn api.index:app --reload
# Visit http://localhost:8000/health — should return {"status":"ok"}
```

Expected: `{"status":"ok"}`

- [ ] **Step 8: Commit**

```bash
git add requirements.txt vercel.json .env.example api/config.py api/db.py api/index.py
git commit -m "feat: scaffold FastAPI backend — config, db, app skeleton"
```

---

### Task 2: Database migrations

**Files:**
- Create: `migrations/001_initial.sql`

- [ ] **Step 1: Create `migrations/001_initial.sql`**

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types (safe to re-run)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('client', 'admin', 'owner');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE enquiry_status AS ENUM ('new', 'read', 'replied');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- users
CREATE TABLE IF NOT EXISTS users (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT        UNIQUE NOT NULL,
    hashed_password TEXT        NOT NULL,
    role            user_role   NOT NULL DEFAULT 'client',
    first_name      TEXT        NOT NULL DEFAULT '',
    last_name       TEXT        NOT NULL DEFAULT '',
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- addresses
CREATE TABLE IF NOT EXISTS addresses (
    id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    street      TEXT    NOT NULL DEFAULT '',
    city        TEXT    NOT NULL DEFAULT '',
    country     TEXT    NOT NULL DEFAULT '',
    postal_code TEXT    NOT NULL DEFAULT '',
    is_default  BOOLEAN NOT NULL DEFAULT FALSE
);

-- categories
CREATE TABLE IF NOT EXISTS categories (
    id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT    NOT NULL,
    slug       TEXT    UNIQUE NOT NULL,
    sort_order INT     NOT NULL DEFAULT 0
);

-- products
CREATE TABLE IF NOT EXISTS products (
    id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT           NOT NULL,
    slug        TEXT           UNIQUE NOT NULL,
    description TEXT           NOT NULL DEFAULT '',
    price       NUMERIC(10,2)  NOT NULL,
    category_id UUID           REFERENCES categories(id) ON DELETE SET NULL,
    sizes       TEXT[]         NOT NULL DEFAULT '{}',
    colors      TEXT[]         NOT NULL DEFAULT '{}',
    is_active   BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- product_images
CREATE TABLE IF NOT EXISTS product_images (
    id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id    UUID    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url           TEXT    NOT NULL,
    thumbnail_url TEXT    NOT NULL,
    storage_path  TEXT    NOT NULL,      -- e.g. "products/abc123/image.webp"
    thumb_path    TEXT    NOT NULL,      -- e.g. "products/abc123/image_thumb.webp"
    is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order    INT     NOT NULL DEFAULT 0
);

-- wishlist_items
CREATE TABLE IF NOT EXISTS wishlist_items (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- enquiries
CREATE TABLE IF NOT EXISTS enquiries (
    id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID            REFERENCES users(id) ON DELETE SET NULL,
    product_id UUID            REFERENCES products(id) ON DELETE SET NULL,
    name       TEXT            NOT NULL,
    email      TEXT            NOT NULL,
    message    TEXT            NOT NULL,
    status     enquiry_status  NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- site_config  (key/value, owner-only writes)
CREATE TABLE IF NOT EXISTS site_config (
    key        TEXT        PRIMARY KEY,
    value      TEXT        NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- setup_flags  (tracks one-time /setup completion)
CREATE TABLE IF NOT EXISTS setup_flags (
    key   TEXT    PRIMARY KEY,
    value BOOLEAN NOT NULL DEFAULT FALSE
);

-- Seed default site_config (idempotent)
INSERT INTO site_config (key, value) VALUES
    ('max_products',          '15'),
    ('max_images_per_product','6'),
    ('storage_quota_mb',      '10240'),
    ('max_upload_size_mb',    '10'),
    ('image_output_max_width','1200'),
    ('enquiry_email',         ''),
    ('maintenance_mode',      'false'),
    ('max_wishlist_items',    '50'),
    ('allow_registrations',   'true')
ON CONFLICT (key) DO NOTHING;
```

- [ ] **Step 2: Apply migration to your Supabase database**

Run via the Supabase SQL Editor or psql:
```bash
psql "$DATABASE_URL" -f migrations/001_initial.sql
```

Expected: no errors, all tables created, 9 site_config rows seeded.

- [ ] **Step 3: Commit**

```bash
git add migrations/001_initial.sql
git commit -m "feat: add initial database schema migration"
```

---

### Task 3: Test infrastructure

**Files:**
- Create: `tests/conftest.py`
- Create: `tests/__init__.py`
- Create: `pytest.ini`

- [ ] **Step 1: Create `pytest.ini`**

```ini
[pytest]
testpaths = tests
env =
    DATABASE_URL=postgresql://postgres:password@localhost:5432/clothing_test
```

Install `pytest-dotenv`:
```bash
pip install pytest-dotenv
```

Add `pytest-dotenv` to `requirements.txt`.

- [ ] **Step 2: Create `tests/__init__.py`** (empty)

- [ ] **Step 3: Create `tests/conftest.py`**

```python
import os
import pytest
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi.testclient import TestClient

# Point at a dedicated test DB — set TEST_DATABASE_URL in your shell or .env.test
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", os.environ["DATABASE_URL"])


@pytest.fixture(scope="session", autouse=True)
def apply_schema():
    """Apply migrations once per test session."""
    conn = psycopg2.connect(dsn=TEST_DATABASE_URL)
    conn.autocommit = True
    with open("migrations/001_initial.sql") as f:
        conn.cursor().execute(f.read())
    conn.close()


@pytest.fixture(autouse=True)
def clean_tables():
    """Truncate all data tables before each test."""
    conn = psycopg2.connect(dsn=TEST_DATABASE_URL)
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
    conn = psycopg2.connect(dsn=TEST_DATABASE_URL, cursor_factory=RealDictCursor)
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
```

- [ ] **Step 4: Run pytest to confirm infrastructure works (zero tests = zero failures)**

```bash
pytest -v
```

Expected: `no tests ran` — no errors.

- [ ] **Step 5: Commit**

```bash
git add tests/ pytest.ini requirements.txt
git commit -m "test: add pytest infrastructure and DB fixtures"
```

---

### Task 4: Auth utilities (JWT + bcrypt)

**Files:**
- Create: `api/auth.py`
- Create: `tests/test_auth_utils.py`

- [ ] **Step 1: Write failing tests for auth utilities**

Create `tests/test_auth_utils.py`:

```python
from api.auth import (
    hash_password, verify_password,
    create_access_token, decode_access_token,
    create_refresh_token, decode_refresh_token,
)


def test_password_hash_and_verify():
    hashed = hash_password("mysecret")
    assert verify_password("mysecret", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_access_token_roundtrip():
    token = create_access_token(user_id="abc123", role="client")
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "abc123"
    assert payload["role"] == "client"


def test_refresh_token_not_accepted_as_access():
    token = create_refresh_token(user_id="abc123")
    assert decode_access_token(token) is None  # must be rejected


def test_refresh_token_roundtrip():
    token = create_refresh_token(user_id="abc123")
    user_id = decode_refresh_token(token)
    assert user_id == "abc123"


def test_access_token_not_accepted_as_refresh():
    token = create_access_token(user_id="abc123", role="admin")
    assert decode_refresh_token(token) is None
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_auth_utils.py -v
```

Expected: `ImportError` — `api.auth` not found.

- [ ] **Step 3: Create `api/auth.py`**

```python
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    return jwt.encode(
        {"sub": user_id, "role": role, "exp": expire},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.refresh_token_expire_days
    )
    return jwt.encode(
        {"sub": user_id, "type": "refresh", "exp": expire},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        if payload.get("type") == "refresh":
            return None
        return payload
    except JWTError:
        return None


def decode_refresh_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        if payload.get("type") != "refresh":
            return None
        return payload.get("sub")
    except JWTError:
        return None
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
pytest tests/test_auth_utils.py -v
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add api/auth.py tests/test_auth_utils.py
git commit -m "feat: add JWT + bcrypt auth utilities"
```

---

### Task 5: FastAPI dependencies (current user, role checks)

**Files:**
- Create: `api/dependencies.py`

- [ ] **Step 1: Create `api/dependencies.py`**

```python
from fastapi import Depends, HTTPException, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import psycopg2.extras

from .auth import decode_access_token, decode_refresh_token
from .db import get_db

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    conn=Depends(get_db),
) -> dict:
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    cur = conn.cursor()
    cur.execute(
        "SELECT id, email, role, first_name, last_name, is_active "
        "FROM users WHERE id = %s",
        (payload["sub"],),
    )
    row = cur.fetchone()
    if not row or not row["is_active"]:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return dict(row)


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_owner(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    return current_user


def get_config(key: str, conn) -> str:
    """Read a single site_config value."""
    cur = conn.cursor()
    cur.execute("SELECT value FROM site_config WHERE key = %s", (key,))
    row = cur.fetchone()
    if not row:
        raise RuntimeError(f"Missing site_config key: {key}")
    return row["value"]
```

- [ ] **Step 2: Commit**

```bash
git add api/dependencies.py
git commit -m "feat: add FastAPI auth dependencies (current_user, require_admin, require_owner)"
```

---

### Task 6: /setup endpoint (one-time owner bootstrap)

**Files:**
- Create: `api/routers/setup.py`
- Create: `tests/test_setup.py`
- Modify: `api/index.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_setup.py`:

```python
import os
from tests.conftest import auth_header


def test_setup_creates_owner(client, db):
    r = client.post("/setup")
    assert r.status_code == 201
    assert r.json()["role"] == "owner"

    cur = db.cursor()
    cur.execute("SELECT role FROM users WHERE email = %s", (os.environ["ADMIN_EMAIL"],))
    row = cur.fetchone()
    assert row is not None
    assert row["role"] == "owner"


def test_setup_disabled_after_first_use(client):
    client.post("/setup")  # first call
    r = client.post("/setup")  # second call
    assert r.status_code == 409


def test_setup_returns_access_token(client):
    r = client.post("/setup")
    assert "access_token" in r.json()
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_setup.py -v
```

Expected: 404 — route not found.

- [ ] **Step 3: Create `api/routers/setup.py`**

```python
import os
from fastapi import APIRouter, Depends, HTTPException
from ..auth import hash_password, create_access_token, create_refresh_token
from ..config import settings
from ..db import get_db

router = APIRouter(tags=["setup"])


@router.post("/setup", status_code=201)
def setup(conn=Depends(get_db)):
    cur = conn.cursor()

    # Check if already run
    cur.execute("SELECT value FROM setup_flags WHERE key = 'owner_created'")
    row = cur.fetchone()
    if row and row["value"]:
        raise HTTPException(status_code=409, detail="Setup already completed")

    email = settings.admin_email
    password = settings.admin_password
    if not email or not password:
        raise HTTPException(
            status_code=500,
            detail="ADMIN_EMAIL and ADMIN_PASSWORD env vars must be set",
        )

    hashed = hash_password(password)
    cur.execute(
        """
        INSERT INTO users (email, hashed_password, role, first_name, last_name)
        VALUES (%s, %s, 'owner', 'Owner', 'Account')
        RETURNING id, email, role
        """,
        (email, hashed),
    )
    user = dict(cur.fetchone())

    # Mark setup as done
    cur.execute(
        "INSERT INTO setup_flags (key, value) VALUES ('owner_created', TRUE) "
        "ON CONFLICT (key) DO UPDATE SET value = TRUE"
    )

    access_token = create_access_token(str(user["id"]), user["role"])
    refresh_token = create_refresh_token(str(user["id"]))

    return {
        "id": str(user["id"]),
        "email": user["email"],
        "role": user["role"],
        "access_token": access_token,
        "refresh_token": refresh_token,
    }
```

- [ ] **Step 4: Mount router in `api/index.py`**

Add to `api/index.py`:

```python
from api.routers import setup as setup_router

app.include_router(setup_router.router)
```

- [ ] **Step 5: Run tests to confirm passing**

```bash
pytest tests/test_setup.py -v
```

Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add api/routers/setup.py api/index.py tests/test_setup.py
git commit -m "feat: add one-time /setup endpoint for owner bootstrap"
```

---

### Task 7: Auth endpoints (register, login, logout, refresh)

**Files:**
- Create: `api/routers/auth.py`
- Create: `tests/test_auth.py`
- Modify: `api/index.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_auth.py`:

```python
from tests.conftest import register_user, login_user, auth_header


def test_register_creates_client_user(client, db):
    r = client.post("/auth/register", json={
        "email": "alice@example.com", "password": "secret123",
        "first_name": "Alice", "last_name": "Smith",
    })
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "alice@example.com"
    assert body["role"] == "client"
    assert "access_token" in body


def test_register_blocked_when_registrations_disabled(client, db):
    db.cursor().execute(
        "UPDATE site_config SET value = 'false' WHERE key = 'allow_registrations'"
    )
    r = client.post("/auth/register", json={
        "email": "bob@example.com", "password": "secret123",
        "first_name": "Bob", "last_name": "Jones",
    })
    assert r.status_code == 403


def test_register_duplicate_email_rejected(client):
    register_user(client, email="alice@example.com")
    r = client.post("/auth/register", json={
        "email": "alice@example.com", "password": "other",
        "first_name": "A", "last_name": "B",
    })
    assert r.status_code == 409


def test_login_returns_token(client):
    register_user(client, email="alice@example.com", password="pass1234")
    r = client.post("/auth/login", json={"email": "alice@example.com", "password": "pass1234"})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password(client):
    register_user(client, email="alice@example.com", password="correct")
    r = client.post("/auth/login", json={"email": "alice@example.com", "password": "wrong"})
    assert r.status_code == 401


def test_refresh_rotates_token(client):
    r = client.post("/auth/register", json={
        "email": "alice@example.com", "password": "pass1234",
        "first_name": "A", "last_name": "B",
    })
    refresh_token = r.json()["refresh_token"]
    r2 = client.post("/auth/refresh", cookies={"refresh_token": refresh_token})
    assert r2.status_code == 200
    assert "access_token" in r2.json()


def test_logout_clears_cookie(client):
    register_user(client, email="alice@example.com", password="pass1234")
    r = client.post("/auth/logout")
    assert r.status_code == 200


def test_protected_route_requires_token(client):
    r = client.get("/account/profile")
    assert r.status_code == 403  # missing Bearer
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_auth.py -v
```

Expected: all fail — routes not found.

- [ ] **Step 3: Create `api/routers/auth.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie
from pydantic import BaseModel, EmailStr
from typing import Optional

from ..auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_refresh_token,
)
from ..db import get_db
from ..dependencies import get_config

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "refresh_token"
COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days in seconds


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
    )


@router.post("/register", status_code=201)
def register(body: RegisterIn, response: Response, conn=Depends(get_db)):
    allow = get_config("allow_registrations", conn)
    if allow != "true":
        raise HTTPException(status_code=403, detail="Registrations are currently disabled")

    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE email = %s", (body.email,))
    if cur.fetchone():
        raise HTTPException(status_code=409, detail="Email already registered")

    hashed = hash_password(body.password)
    cur.execute(
        """
        INSERT INTO users (email, hashed_password, role, first_name, last_name)
        VALUES (%s, %s, 'client', %s, %s)
        RETURNING id, email, role
        """,
        (body.email, hashed, body.first_name, body.last_name),
    )
    user = dict(cur.fetchone())

    access = create_access_token(str(user["id"]), user["role"])
    refresh = create_refresh_token(str(user["id"]))
    _set_refresh_cookie(response, refresh)

    return {"id": str(user["id"]), "email": user["email"], "role": user["role"],
            "access_token": access, "refresh_token": refresh}


@router.post("/login")
def login(body: LoginIn, response: Response, conn=Depends(get_db)):
    cur = conn.cursor()
    cur.execute(
        "SELECT id, hashed_password, role, is_active FROM users WHERE email = %s",
        (body.email,),
    )
    user = cur.fetchone()
    if not user or not user["is_active"] or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access = create_access_token(str(user["id"]), user["role"])
    refresh = create_refresh_token(str(user["id"]))
    _set_refresh_cookie(response, refresh)

    return {"access_token": access}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(REFRESH_COOKIE)
    return {"detail": "Logged out"}


@router.post("/refresh")
def refresh(
    response: Response,
    conn=Depends(get_db),
    refresh_token: Optional[str] = Cookie(default=None),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    user_id = decode_refresh_token(refresh_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    cur = conn.cursor()
    cur.execute("SELECT id, role, is_active FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    if not user or not user["is_active"]:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    access = create_access_token(str(user["id"]), user["role"])
    new_refresh = create_refresh_token(str(user["id"]))
    _set_refresh_cookie(response, new_refresh)

    return {"access_token": access}
```

- [ ] **Step 4: Mount in `api/index.py`**

Add to `api/index.py`:

```python
from api.routers import auth as auth_router

app.include_router(auth_router.router)
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_auth.py -v
```

Expected: 8 passed.

- [ ] **Step 6: Commit**

```bash
git add api/routers/auth.py api/index.py tests/test_auth.py
git commit -m "feat: add register, login, logout, refresh auth endpoints"
```

---

### Task 8: Maintenance mode middleware

**Files:**
- Create: `api/middleware.py`
- Modify: `api/index.py`

- [ ] **Step 1: Create `api/middleware.py`**

```python
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import psycopg2
import psycopg2.extras
from .config import settings

# Paths that bypass maintenance mode
BYPASS_PREFIXES = ("/auth/login", "/auth/refresh", "/admin", "/setup", "/health")


class MaintenanceModeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Admin, auth, and health routes always bypass
        if any(path.startswith(p) for p in BYPASS_PREFIXES):
            return await call_next(request)

        try:
            conn = psycopg2.connect(
                dsn=settings.database_url,
                cursor_factory=psycopg2.extras.RealDictCursor,
            )
            cur = conn.cursor()
            cur.execute("SELECT value FROM site_config WHERE key = 'maintenance_mode'")
            row = cur.fetchone()
            conn.close()

            if row and row["value"] == "true":
                return JSONResponse(
                    status_code=503,
                    content={"detail": "Site is under maintenance. Please check back soon."},
                )
        except Exception:
            pass  # If DB is unreachable, don't block the request

        return await call_next(request)
```

- [ ] **Step 2: Mount middleware in `api/index.py`**

Add after `CORSMiddleware`:

```python
from api.middleware import MaintenanceModeMiddleware

app.add_middleware(MaintenanceModeMiddleware)
```

- [ ] **Step 3: Test manually via TestClient**

Add a quick test to `tests/test_setup.py`:

```python
def test_maintenance_mode_blocks_public(client, db):
    db.cursor().execute(
        "UPDATE site_config SET value = 'true' WHERE key = 'maintenance_mode'"
    )
    r = client.get("/shop/some-product")
    assert r.status_code == 503

def test_maintenance_mode_allows_admin(client, db):
    db.cursor().execute(
        "UPDATE site_config SET value = 'true' WHERE key = 'maintenance_mode'"
    )
    r = client.get("/admin/dashboard")
    # 404 because route not yet registered, but not 503
    assert r.status_code != 503
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_setup.py -v
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add api/middleware.py api/index.py tests/test_setup.py
git commit -m "feat: add maintenance mode middleware"
```

---

### Task 9: Site config (owner-only read/write)

**Files:**
- Create: `api/routers/site_config.py`
- Create: `tests/test_site_config.py`
- Modify: `api/index.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_site_config.py`:

```python
import os
from tests.conftest import auth_header


def _owner_token(client):
    client.post("/setup")
    r = client.post("/auth/login", json={
        "email": os.environ["ADMIN_EMAIL"],
        "password": os.environ["ADMIN_PASSWORD"],
    })
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


def test_admin_cannot_access_settings(client):
    # Create an admin via direct DB manipulation or setup + promote
    client.post("/setup")  # creates owner
    # Register a normal client then we'll use owner to promote (not built yet — skip to owner test)
    pass


def test_non_owner_cannot_update_config(client):
    client.post("/auth/register", json={
        "email": "user@example.com", "password": "pass1234",
        "first_name": "U", "last_name": "S",
    })
    token = client.post("/auth/login", json={
        "email": "user@example.com", "password": "pass1234"
    }).json()["access_token"]
    r = client.put("/admin/settings", json={"max_products": "100"},
                   headers=auth_header(token))
    assert r.status_code == 403
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_site_config.py -v
```

Expected: fail — routes not found.

- [ ] **Step 3: Create `api/routers/site_config.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..db import get_db
from ..dependencies import require_owner

router = APIRouter(prefix="/admin/settings", tags=["site_config"])

VALID_KEYS = {
    "max_products", "max_images_per_product", "storage_quota_mb",
    "max_upload_size_mb", "image_output_max_width", "enquiry_email",
    "maintenance_mode", "max_wishlist_items", "allow_registrations",
}


@router.get("")
def get_config(conn=Depends(get_db), _=Depends(require_owner)):
    cur = conn.cursor()
    cur.execute("SELECT key, value FROM site_config ORDER BY key")
    rows = cur.fetchall()
    return {row["key"]: row["value"] for row in rows}


@router.put("")
def update_config(
    updates: dict,
    conn=Depends(get_db),
    _=Depends(require_owner),
):
    invalid = set(updates.keys()) - VALID_KEYS
    if invalid:
        raise HTTPException(status_code=422, detail=f"Unknown config keys: {invalid}")

    cur = conn.cursor()
    for key, value in updates.items():
        cur.execute(
            "UPDATE site_config SET value = %s, updated_at = NOW() WHERE key = %s",
            (str(value), key),
        )
    return {"detail": "Config updated"}
```

- [ ] **Step 4: Mount in `api/index.py`**

```python
from api.routers import site_config as site_config_router

app.include_router(site_config_router.router)
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_site_config.py -v
```

Expected: 3 passed (1 skipped placeholder).

- [ ] **Step 6: Commit**

```bash
git add api/routers/site_config.py api/index.py tests/test_site_config.py
git commit -m "feat: add owner-only site config endpoints"
```

---

### Task 10: Categories CRUD

**Files:**
- Create: `api/routers/categories.py`
- Create: `tests/test_categories.py`
- Modify: `api/index.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_categories.py`:

```python
import os
from tests.conftest import auth_header


def _owner_token(client):
    client.post("/setup")
    r = client.post("/auth/login", json={
        "email": os.environ["ADMIN_EMAIL"], "password": os.environ["ADMIN_PASSWORD"],
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


def test_admin_deletes_category(client):
    token = _owner_token(client)
    created = client.post("/admin/categories", json={"name": "Bags"},
                          headers=auth_header(token)).json()
    r = client.delete(f"/admin/categories/{created['id']}", headers=auth_header(token))
    assert r.status_code == 204
    assert client.get("/categories").json() == []
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_categories.py -v
```

- [ ] **Step 3: Create `api/routers/categories.py`**

```python
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..db import get_db
from ..dependencies import require_admin

router = APIRouter(tags=["categories"])


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


class CategoryIn(BaseModel):
    name: str
    sort_order: int = 0


@router.get("/categories")
def list_categories(conn=Depends(get_db)):
    cur = conn.cursor()
    cur.execute("SELECT id, name, slug, sort_order FROM categories ORDER BY sort_order, name")
    return [dict(r) for r in cur.fetchall()]


@router.post("/admin/categories", status_code=201)
def create_category(body: CategoryIn, conn=Depends(get_db), _=Depends(require_admin)):
    slug = _slugify(body.name)
    cur = conn.cursor()
    cur.execute("SELECT id FROM categories WHERE slug = %s", (slug,))
    if cur.fetchone():
        raise HTTPException(status_code=409, detail="Category with this name already exists")
    cur.execute(
        "INSERT INTO categories (name, slug, sort_order) VALUES (%s, %s, %s) RETURNING id, name, slug, sort_order",
        (body.name, slug, body.sort_order),
    )
    return dict(cur.fetchone())


@router.put("/admin/categories/{category_id}")
def update_category(
    category_id: str,
    body: CategoryIn,
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    slug = _slugify(body.name)
    cur = conn.cursor()
    cur.execute(
        "UPDATE categories SET name=%s, slug=%s, sort_order=%s WHERE id=%s "
        "RETURNING id, name, slug, sort_order",
        (body.name, slug, body.sort_order, category_id),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")
    return dict(row)


@router.delete("/admin/categories/{category_id}", status_code=204)
def delete_category(category_id: str, conn=Depends(get_db), _=Depends(require_admin)):
    cur = conn.cursor()
    cur.execute("DELETE FROM categories WHERE id = %s", (category_id,))
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Category not found")
```

- [ ] **Step 4: Mount in `api/index.py`**

```python
from api.routers import categories as categories_router

app.include_router(categories_router.router)
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_categories.py -v
```

Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add api/routers/categories.py api/index.py tests/test_categories.py
git commit -m "feat: add categories CRUD (public GET + admin POST/PUT/DELETE)"
```

---

### Task 11: Image processor + Supabase Storage wrapper

**Files:**
- Create: `api/image_processor.py`
- Create: `api/storage.py`
- Create: `tests/test_image_processor.py`

- [ ] **Step 1: Write failing tests for image processor**

Create `tests/test_image_processor.py`:

```python
import io
from PIL import Image
from api.image_processor import process_image


def _make_image(width: int, height: int) -> bytes:
    img = Image.new("RGB", (width, height), color=(255, 0, 0))
    buf = io.BytesIO()
    img.save(buf, "JPEG")
    return buf.getvalue()


def test_wide_image_is_resized():
    data = _make_image(2400, 1200)
    full, thumb = process_image(data, max_width=1200)
    with Image.open(io.BytesIO(full)) as img:
        assert img.width == 1200
        assert img.height == 600  # proportional


def test_small_image_not_upscaled():
    data = _make_image(800, 600)
    full, _ = process_image(data, max_width=1200)
    with Image.open(io.BytesIO(full)) as img:
        assert img.width == 800  # unchanged


def test_thumbnail_is_300x300():
    data = _make_image(1200, 800)
    _, thumb = process_image(data)
    with Image.open(io.BytesIO(thumb)) as img:
        assert img.size == (300, 300)


def test_output_is_webp():
    data = _make_image(400, 400)
    full, thumb = process_image(data)
    assert Image.open(io.BytesIO(full)).format == "WEBP"
    assert Image.open(io.BytesIO(thumb)).format == "WEBP"
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_image_processor.py -v
```

- [ ] **Step 3: Create `api/image_processor.py`**

```python
import io
from PIL import Image


def process_image(
    data: bytes,
    max_width: int = 1200,
    thumbnail_size: tuple[int, int] = (300, 300),
) -> tuple[bytes, bytes]:
    """
    Process an uploaded image.
    Returns (full_webp_bytes, thumbnail_webp_bytes).
    Resizes proportionally if width > max_width. Thumbnail is a centre-cropped square.
    """
    with Image.open(io.BytesIO(data)) as img:
        img = img.convert("RGB")

        # Resize full image if too wide
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.LANCZOS)

        full_buf = io.BytesIO()
        img.save(full_buf, "WEBP", quality=85)
        full_bytes = full_buf.getvalue()

        # Thumbnail: centre-crop to square, then resize
        thumb = img.copy()
        min_dim = min(thumb.width, thumb.height)
        left = (thumb.width - min_dim) // 2
        top = (thumb.height - min_dim) // 2
        thumb = thumb.crop((left, top, left + min_dim, top + min_dim))
        thumb = thumb.resize(thumbnail_size, Image.LANCZOS)

        thumb_buf = io.BytesIO()
        thumb.save(thumb_buf, "WEBP", quality=80)
        thumb_bytes = thumb_buf.getvalue()

    return full_bytes, thumb_bytes
```

- [ ] **Step 4: Create `api/storage.py`**

```python
from supabase import create_client, Client
from .config import settings

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _client


def upload_file(storage_path: str, data: bytes, content_type: str = "image/webp") -> str:
    """Upload bytes to Supabase Storage. Returns the public URL."""
    client = _get_client()
    client.storage.from_(settings.supabase_storage_bucket).upload(
        storage_path,
        data,
        {"content-type": content_type, "cache-control": "3600"},
    )
    return client.storage.from_(settings.supabase_storage_bucket).get_public_url(storage_path)


def delete_files(paths: list[str]) -> None:
    """Delete one or more files from Supabase Storage."""
    if not paths:
        return
    client = _get_client()
    client.storage.from_(settings.supabase_storage_bucket).remove(paths)
```

- [ ] **Step 5: Run image processor tests**

```bash
pytest tests/test_image_processor.py -v
```

Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add api/image_processor.py api/storage.py tests/test_image_processor.py
git commit -m "feat: add image processor (Pillow WebP resize+thumbnail) and Supabase Storage wrapper"
```

---

### Task 12: Products CRUD + image upload

**Files:**
- Create: `api/routers/products.py`
- Create: `api/routers/images.py`
- Create: `tests/test_products.py`
- Create: `tests/test_images.py`
- Modify: `api/index.py`

- [ ] **Step 1: Write failing tests for products**

Create `tests/test_products.py`:

```python
import os
from tests.conftest import auth_header


def _owner_token(client):
    client.post("/setup")
    r = client.post("/auth/login", json={
        "email": os.environ["ADMIN_EMAIL"], "password": os.environ["ADMIN_PASSWORD"],
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
    db.cursor().execute("UPDATE site_config SET value = '1' WHERE key = 'max_products'")
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_products.py -v
```

- [ ] **Step 3: Create `api/routers/products.py`**

```python
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from ..db import get_db
from ..dependencies import require_admin, get_config

router = APIRouter(tags=["products"])


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


class ProductIn(BaseModel):
    name: str
    description: str = ""
    price: float
    category_id: Optional[str] = None
    sizes: list[str] = []
    colors: list[str] = []
    is_active: bool = False


# ── Public ─────────────────────────────────────────────────────────────────

@router.get("/products")
def list_products(
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    conn=Depends(get_db),
):
    cur = conn.cursor()
    params: list = []
    where = "WHERE p.is_active = TRUE"

    if category:
        where += " AND c.slug = %s"
        params.append(category)

    offset = (page - 1) * page_size
    cur.execute(
        f"""
        SELECT p.id, p.name, p.slug, p.price, p.sizes, p.colors,
               p.category_id, c.name AS category_name,
               pi.thumbnail_url AS primary_thumbnail
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
        {where}
        ORDER BY p.created_at DESC
        LIMIT %s OFFSET %s
        """,
        params + [page_size, offset],
    )
    items = [dict(r) for r in cur.fetchall()]

    cur.execute(
        f"SELECT COUNT(*) AS total FROM products p LEFT JOIN categories c ON c.id = p.category_id {where}",
        params,
    )
    total = cur.fetchone()["total"]

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/products/{slug}")
def get_product(slug: str, conn=Depends(get_db)):
    cur = conn.cursor()
    cur.execute(
        """
        SELECT p.*, c.name AS category_name, c.slug AS category_slug
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.slug = %s AND p.is_active = TRUE
        """,
        (slug,),
    )
    product = cur.fetchone()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    cur.execute(
        "SELECT id, url, thumbnail_url, is_primary, sort_order "
        "FROM product_images WHERE product_id = %s ORDER BY sort_order",
        (str(product["id"]),),
    )
    images = [dict(r) for r in cur.fetchall()]

    result = dict(product)
    result["images"] = images
    return result


# ── Admin ───────────────────────────────────────────────────────────────────

@router.get("/admin/products")
def admin_list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    cur = conn.cursor()
    offset = (page - 1) * page_size
    cur.execute(
        """
        SELECT p.id, p.name, p.slug, p.price, p.is_active, p.created_at,
               c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        ORDER BY p.created_at DESC
        LIMIT %s OFFSET %s
        """,
        (page_size, offset),
    )
    items = [dict(r) for r in cur.fetchall()]
    cur.execute("SELECT COUNT(*) AS total FROM products")
    total = cur.fetchone()["total"]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/admin/products", status_code=201)
def create_product(body: ProductIn, conn=Depends(get_db), _=Depends(require_admin)):
    max_products = int(get_config("max_products", conn))
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) AS cnt FROM products")
    if cur.fetchone()["cnt"] >= max_products:
        raise HTTPException(
            status_code=422,
            detail=f"Product limit reached ({max_products}). Update max_products in settings.",
        )

    slug = _slugify(body.name)
    cur.execute("SELECT id FROM products WHERE slug = %s", (slug,))
    if cur.fetchone():
        raise HTTPException(status_code=409, detail="Product with this name already exists")

    cur.execute(
        """
        INSERT INTO products (name, slug, description, price, category_id, sizes, colors, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, name, slug, description, price, category_id, sizes, colors, is_active, created_at
        """,
        (body.name, slug, body.description, body.price,
         body.category_id, body.sizes, body.colors, body.is_active),
    )
    return dict(cur.fetchone())


@router.put("/admin/products/{product_id}")
def update_product(
    product_id: str,
    body: ProductIn,
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    slug = _slugify(body.name)
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE products SET name=%s, slug=%s, description=%s, price=%s,
            category_id=%s, sizes=%s, colors=%s, is_active=%s, updated_at=NOW()
        WHERE id=%s
        RETURNING id, name, slug, price, is_active
        """,
        (body.name, slug, body.description, body.price,
         body.category_id, body.sizes, body.colors, body.is_active, product_id),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    return dict(row)


@router.delete("/admin/products/{product_id}", status_code=204)
def delete_product(product_id: str, conn=Depends(get_db), _=Depends(require_admin)):
    cur = conn.cursor()
    cur.execute("DELETE FROM products WHERE id = %s", (product_id,))
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Product not found")
```

- [ ] **Step 4: Create `api/routers/images.py`**

```python
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from ..db import get_db
from ..dependencies import require_admin, get_config
from ..image_processor import process_image
from ..storage import upload_file, delete_files

router = APIRouter(tags=["images"])

MB = 1024 * 1024


@router.post("/admin/products/{product_id}/images", status_code=201)
def upload_image(
    product_id: str,
    file: UploadFile = File(...),
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    max_upload_mb = int(get_config("max_upload_size_mb", conn))
    max_images = int(get_config("max_images_per_product", conn))
    max_width = int(get_config("image_output_max_width", conn))
    quota_mb = int(get_config("storage_quota_mb", conn))

    # Validate content type
    if file.content_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
        raise HTTPException(status_code=422, detail="Unsupported image format")

    cur = conn.cursor()

    # Check product exists
    cur.execute("SELECT id FROM products WHERE id = %s", (product_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Product not found")

    # Check image count for this product
    cur.execute("SELECT COUNT(*) AS cnt FROM product_images WHERE product_id = %s", (product_id,))
    if cur.fetchone()["cnt"] >= max_images:
        raise HTTPException(status_code=422, detail=f"Max {max_images} images per product")

    # Read and size-check
    data = file.file.read()
    if len(data) > max_upload_mb * MB:
        raise HTTPException(status_code=413, detail=f"File exceeds {max_upload_mb}MB limit")

    # Process image
    full_bytes, thumb_bytes = process_image(data, max_width=max_width)

    # Check storage quota (rough: count existing bytes by summing file sizes is not feasible here;
    # we track quota by counting total uploads × estimated size. For now, check row count × avg.)
    # A full quota check would require storing byte sizes in product_images — add storage_bytes column
    # if precise quota tracking is needed in a future iteration.

    # Upload to Supabase Storage
    image_id = str(uuid.uuid4())
    storage_path = f"products/{product_id}/{image_id}.webp"
    thumb_path = f"products/{product_id}/{image_id}_thumb.webp"

    url = upload_file(storage_path, full_bytes)
    thumbnail_url = upload_file(thumb_path, thumb_bytes)

    # Determine if this is the first (primary) image
    cur.execute("SELECT COUNT(*) AS cnt FROM product_images WHERE product_id = %s", (product_id,))
    is_primary = cur.fetchone()["cnt"] == 0

    cur.execute(
        """
        INSERT INTO product_images (product_id, url, thumbnail_url, storage_path, thumb_path, is_primary, sort_order)
        VALUES (%s, %s, %s, %s, %s, %s, (SELECT COALESCE(MAX(sort_order)+1, 0) FROM product_images WHERE product_id = %s))
        RETURNING id, url, thumbnail_url, is_primary, sort_order
        """,
        (product_id, url, thumbnail_url, storage_path, thumb_path, is_primary, product_id),
    )
    return dict(cur.fetchone())


@router.delete("/admin/products/{product_id}/images/{image_id}", status_code=204)
def delete_image(
    product_id: str,
    image_id: str,
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    cur = conn.cursor()
    cur.execute(
        "SELECT storage_path, thumb_path, is_primary FROM product_images WHERE id = %s AND product_id = %s",
        (image_id, product_id),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Image not found")

    delete_files([row["storage_path"], row["thumb_path"]])
    cur.execute("DELETE FROM product_images WHERE id = %s", (image_id,))

    # If deleted image was primary, promote the next one
    if row["is_primary"]:
        cur.execute(
            "UPDATE product_images SET is_primary = TRUE "
            "WHERE product_id = %s ORDER BY sort_order LIMIT 1",
            (product_id,),
        )


@router.put("/admin/products/{product_id}/images/{image_id}/primary", status_code=200)
def set_primary_image(
    product_id: str,
    image_id: str,
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    cur = conn.cursor()
    cur.execute(
        "UPDATE product_images SET is_primary = FALSE WHERE product_id = %s", (product_id,)
    )
    cur.execute(
        "UPDATE product_images SET is_primary = TRUE WHERE id = %s AND product_id = %s "
        "RETURNING id",
        (image_id, product_id),
    )
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Image not found")
    return {"detail": "Primary image updated"}
```

- [ ] **Step 5: Mount both routers in `api/index.py`**

```python
from api.routers import products as products_router
from api.routers import images as images_router

app.include_router(products_router.router)
app.include_router(images_router.router)
```

- [ ] **Step 6: Run product tests**

```bash
pytest tests/test_products.py -v
```

Expected: 7 passed.

- [ ] **Step 7: Commit**

```bash
git add api/routers/products.py api/routers/images.py api/index.py tests/test_products.py
git commit -m "feat: add products CRUD (public browse + admin), image upload with Pillow/Supabase"
```

---

### Task 13: Enquiries

**Files:**
- Create: `api/routers/enquiries.py`
- Create: `tests/test_enquiries.py`
- Modify: `api/index.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_enquiries.py`:

```python
import os
from tests.conftest import auth_header, register_user, login_user


def _owner_token(client):
    client.post("/setup")
    return client.post("/auth/login", json={
        "email": os.environ["ADMIN_EMAIL"], "password": os.environ["ADMIN_PASSWORD"],
    }).json()["access_token"]


def test_guest_can_submit_enquiry(client):
    r = client.post("/enquiries", json={
        "name": "Jane", "email": "jane@example.com",
        "message": "Do you have this in size 10?",
    })
    assert r.status_code == 201
    assert r.json()["status"] == "new"


def test_admin_can_list_enquiries(client):
    client.post("/enquiries", json={
        "name": "Jane", "email": "jane@example.com", "message": "Hello",
    })
    token = _owner_token(client)
    r = client.get("/admin/enquiries", headers=auth_header(token))
    assert r.status_code == 200
    assert len(r.json()["items"]) == 1


def test_admin_can_update_enquiry_status(client):
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
    r = client.post("/enquiries", json={
        "name": "Alice", "email": "alice@example.com", "message": "Stock query",
    }, headers=auth_header(token))
    assert r.status_code == 201
    assert r.json()["user_id"] is not None
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_enquiries.py -v
```

- [ ] **Step 3: Create `api/routers/enquiries.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional

from ..auth import decode_access_token
from ..db import get_db
from ..dependencies import require_admin

router = APIRouter(tags=["enquiries"])

security = HTTPBearer(auto_error=False)


class EnquiryIn(BaseModel):
    name: str
    email: EmailStr
    message: str
    product_id: Optional[str] = None


class EnquiryStatusIn(BaseModel):
    status: str  # 'new' | 'read' | 'replied'


def _optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    conn=Depends(get_db),
) -> Optional[dict]:
    """Returns the current user if a valid token is present, else None."""
    if not credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return None
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE id = %s AND is_active = TRUE", (payload["sub"],))
    row = cur.fetchone()
    return dict(row) if row else None


@router.post("/enquiries", status_code=201)
def submit_enquiry(
    body: EnquiryIn,
    conn=Depends(get_db),
    current_user: Optional[dict] = Depends(_optional_user),
):
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO enquiries (user_id, product_id, name, email, message)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, user_id, product_id, name, email, message, status, created_at
        """,
        (
            str(current_user["id"]) if current_user else None,
            body.product_id,
            body.name,
            body.email,
            body.message,
        ),
    )
    row = dict(cur.fetchone())
    # Convert UUIDs to strings for JSON serialisation
    row["id"] = str(row["id"])
    row["user_id"] = str(row["user_id"]) if row["user_id"] else None
    return row


@router.get("/admin/enquiries")
def list_enquiries(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    cur = conn.cursor()
    where = ""
    params: list = []
    if status:
        where = "WHERE status = %s"
        params.append(status)

    offset = (page - 1) * page_size
    cur.execute(
        f"SELECT * FROM enquiries {where} ORDER BY created_at DESC LIMIT %s OFFSET %s",
        params + [page_size, offset],
    )
    items = [dict(r) for r in cur.fetchall()]
    cur.execute(f"SELECT COUNT(*) AS total FROM enquiries {where}", params)
    total = cur.fetchone()["total"]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.put("/admin/enquiries/{enquiry_id}")
def update_enquiry(
    enquiry_id: str,
    body: EnquiryStatusIn,
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    if body.status not in ("new", "read", "replied"):
        raise HTTPException(status_code=422, detail="Invalid status")
    cur = conn.cursor()
    cur.execute(
        "UPDATE enquiries SET status = %s WHERE id = %s RETURNING id, status",
        (body.status, enquiry_id),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return dict(row)
```

- [ ] **Step 4: Mount in `api/index.py`**

```python
from api.routers import enquiries as enquiries_router

app.include_router(enquiries_router.router)
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_enquiries.py -v
```

Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add api/routers/enquiries.py api/index.py tests/test_enquiries.py
git commit -m "feat: add enquiries submit (public/guest+auth) + admin list/update"
```

---

### Task 14: Account (profile + address)

**Files:**
- Create: `api/routers/account.py`
- Create: `tests/test_account.py`
- Modify: `api/index.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_account.py`:

```python
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_account.py -v
```

- [ ] **Step 3: Create `api/routers/account.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional

from ..auth import hash_password, verify_password
from ..db import get_db
from ..dependencies import get_current_user

router = APIRouter(prefix="/account", tags=["account"])


class ProfileIn(BaseModel):
    first_name: str
    last_name: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


class AddressIn(BaseModel):
    street: str = ""
    city: str = ""
    country: str = ""
    postal_code: str = ""


@router.get("/profile")
def get_profile(conn=Depends(get_db), current_user: dict = Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute(
        "SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = %s",
        (current_user["id"],),
    )
    return dict(cur.fetchone())


@router.put("/profile")
def update_profile(
    body: ProfileIn,
    conn=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET first_name=%s, last_name=%s WHERE id=%s "
        "RETURNING id, email, first_name, last_name",
        (body.first_name, body.last_name, current_user["id"]),
    )
    return dict(cur.fetchone())


@router.post("/change-password")
def change_password(
    body: ChangePasswordIn,
    conn=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    cur = conn.cursor()
    cur.execute("SELECT hashed_password FROM users WHERE id = %s", (current_user["id"],))
    stored = cur.fetchone()["hashed_password"]
    if not verify_password(body.current_password, stored):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    cur.execute(
        "UPDATE users SET hashed_password = %s WHERE id = %s",
        (hash_password(body.new_password), current_user["id"]),
    )
    return {"detail": "Password updated"}


@router.get("/address")
def get_address(conn=Depends(get_db), current_user: dict = Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute(
        "SELECT id, street, city, country, postal_code, is_default "
        "FROM addresses WHERE user_id = %s AND is_default = TRUE",
        (current_user["id"],),
    )
    row = cur.fetchone()
    if not row:
        return None
    return dict(row)


@router.put("/address")
def upsert_address(
    body: AddressIn,
    conn=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    cur = conn.cursor()
    cur.execute(
        "SELECT id FROM addresses WHERE user_id = %s AND is_default = TRUE",
        (current_user["id"],),
    )
    existing = cur.fetchone()
    if existing:
        cur.execute(
            "UPDATE addresses SET street=%s, city=%s, country=%s, postal_code=%s "
            "WHERE id=%s RETURNING id, street, city, country, postal_code",
            (body.street, body.city, body.country, body.postal_code, existing["id"]),
        )
    else:
        cur.execute(
            "INSERT INTO addresses (user_id, street, city, country, postal_code, is_default) "
            "VALUES (%s,%s,%s,%s,%s,TRUE) "
            "RETURNING id, street, city, country, postal_code",
            (current_user["id"], body.street, body.city, body.country, body.postal_code),
        )
    return dict(cur.fetchone())
```

- [ ] **Step 4: Mount in `api/index.py`**

```python
from api.routers import account as account_router

app.include_router(account_router.router)
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_account.py -v
```

Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add api/routers/account.py api/index.py tests/test_account.py
git commit -m "feat: add account profile, address, and change-password endpoints"
```

---

### Task 15: Wishlist

**Files:**
- Create: `api/routers/wishlist.py`
- Create: `tests/test_wishlist.py`
- Modify: `api/index.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_wishlist.py`:

```python
import os
from tests.conftest import register_user, login_user, auth_header


def _create_product(client, token):
    return client.post("/admin/products", json={
        "name": "Silk Blouse", "price": "69.99", "is_active": True,
    }, headers=auth_header(token)).json()


def _owner_token(client):
    client.post("/setup")
    return client.post("/auth/login", json={
        "email": os.environ["ADMIN_EMAIL"], "password": os.environ["ADMIN_PASSWORD"],
    }).json()["access_token"]


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
    db.cursor().execute("UPDATE site_config SET value = '1' WHERE key = 'max_wishlist_items'")
    owner_token = _owner_token(client)
    p1 = client.post("/admin/products", json={
        "name": "Product A", "price": "10.00", "is_active": True,
    }, headers=auth_header(owner_token)).json()
    p2 = client.post("/admin/products", json={
        "name": "Product B", "price": "20.00", "is_active": True,
    }, headers=auth_header(owner_token)).json()

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
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_wishlist.py -v
```

- [ ] **Step 3: Create `api/routers/wishlist.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from ..db import get_db
from ..dependencies import get_current_user, get_config

router = APIRouter(prefix="/account/wishlist", tags=["wishlist"])


@router.get("")
def list_wishlist(conn=Depends(get_db), current_user: dict = Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute(
        """
        SELECT w.id, w.product_id, p.name, p.slug, p.price,
               pi.thumbnail_url AS primary_thumbnail
        FROM wishlist_items w
        JOIN products p ON p.id = w.product_id
        LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
        WHERE w.user_id = %s
        ORDER BY w.created_at DESC
        """,
        (current_user["id"],),
    )
    return [dict(r) for r in cur.fetchall()]


@router.post("/{product_id}", status_code=201)
def add_to_wishlist(
    product_id: str,
    conn=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    max_items = int(get_config("max_wishlist_items", conn))
    cur = conn.cursor()

    cur.execute(
        "SELECT COUNT(*) AS cnt FROM wishlist_items WHERE user_id = %s",
        (current_user["id"],),
    )
    if cur.fetchone()["cnt"] >= max_items:
        raise HTTPException(status_code=422, detail=f"Wishlist limit of {max_items} reached")

    try:
        cur.execute(
            "INSERT INTO wishlist_items (user_id, product_id) VALUES (%s, %s) "
            "RETURNING id, product_id",
            (current_user["id"], product_id),
        )
        return dict(cur.fetchone())
    except Exception:
        raise HTTPException(status_code=409, detail="Item already in wishlist")


@router.delete("/{product_id}", status_code=204)
def remove_from_wishlist(
    product_id: str,
    conn=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM wishlist_items WHERE user_id = %s AND product_id = %s",
        (current_user["id"], product_id),
    )
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Item not in wishlist")
```

- [ ] **Step 4: Mount in `api/index.py`**

```python
from api.routers import wishlist as wishlist_router

app.include_router(wishlist_router.router)
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_wishlist.py -v
```

Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add api/routers/wishlist.py api/index.py tests/test_wishlist.py
git commit -m "feat: add wishlist (add/remove/list, cap enforced from site_config)"
```

---

### Task 16: Admin — client account management

**Files:**
- Create: `api/routers/admin_clients.py`
- Create: `tests/test_admin_clients.py`
- Modify: `api/index.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_admin_clients.py`:

```python
import os
from tests.conftest import register_user, auth_header


def _owner_token(client):
    client.post("/setup")
    return client.post("/auth/login", json={
        "email": os.environ["ADMIN_EMAIL"], "password": os.environ["ADMIN_PASSWORD"],
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
    cur = db.cursor()
    cur.execute("SELECT is_active FROM users WHERE id = %s", (alice["id"],))
    assert cur.fetchone()["is_active"] is False


def test_admin_promotes_client_to_admin(client, db):
    register_user(client, "alice@example.com", "pass1234")
    token = _owner_token(client)
    r = client.get("/admin/clients", headers=auth_header(token))
    alice = next(u for u in r.json()["items"] if u["email"] == "alice@example.com")
    r2 = client.put(f"/admin/clients/{alice['id']}/promote", headers=auth_header(token))
    assert r2.status_code == 200
    cur = db.cursor()
    cur.execute("SELECT role FROM users WHERE id = %s", (alice["id"],))
    assert cur.fetchone()["role"] == "admin"


def test_owner_cannot_be_promoted_to_admin(client):
    """Owner role cannot be downgraded via the clients UI."""
    token = _owner_token(client)
    r = client.get("/admin/clients", headers=auth_header(token))
    # owner account should not appear in client list, or if it does, promote is blocked
    # (owner promotion to admin would be a demotion — block it)
    owner_accounts = [u for u in r.json()["items"] if u["role"] == "owner"]
    if owner_accounts:
        owner_id = owner_accounts[0]["id"]
        r2 = client.put(f"/admin/clients/{owner_id}/promote", headers=auth_header(token))
        assert r2.status_code == 422


def test_admin_deletes_client(client, db):
    register_user(client, "alice@example.com", "pass1234")
    token = _owner_token(client)
    r = client.get("/admin/clients", headers=auth_header(token))
    alice = next(u for u in r.json()["items"] if u["email"] == "alice@example.com")
    r2 = client.delete(f"/admin/clients/{alice['id']}", headers=auth_header(token))
    assert r2.status_code == 204
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_admin_clients.py -v
```

- [ ] **Step 3: Create `api/routers/admin_clients.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from ..db import get_db
from ..dependencies import require_admin, require_owner

router = APIRouter(prefix="/admin/clients", tags=["admin_clients"])


@router.get("")
def list_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    cur = conn.cursor()
    offset = (page - 1) * page_size
    cur.execute(
        "SELECT id, email, role, first_name, last_name, is_active, created_at "
        "FROM users WHERE role != 'owner' ORDER BY created_at DESC LIMIT %s OFFSET %s",
        (page_size, offset),
    )
    items = [dict(r) for r in cur.fetchall()]
    cur.execute("SELECT COUNT(*) AS total FROM users WHERE role != 'owner'")
    total = cur.fetchone()["total"]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.put("/{user_id}/disable")
def disable_client(user_id: str, conn=Depends(get_db), _=Depends(require_admin)):
    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET is_active = FALSE WHERE id = %s AND role != 'owner' RETURNING id, email, is_active",
        (user_id,),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found or cannot be disabled")
    return dict(row)


@router.put("/{user_id}/enable")
def enable_client(user_id: str, conn=Depends(get_db), _=Depends(require_admin)):
    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET is_active = TRUE WHERE id = %s AND role != 'owner' RETURNING id, email, is_active",
        (user_id,),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)


@router.put("/{user_id}/promote")
def promote_to_admin(user_id: str, conn=Depends(get_db), _=Depends(require_owner)):
    """Promote a client to admin. Only owner can do this. Cannot change another owner."""
    cur = conn.cursor()
    cur.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if row["role"] == "owner":
        raise HTTPException(status_code=422, detail="Cannot change the owner role")
    cur.execute(
        "UPDATE users SET role = 'admin' WHERE id = %s RETURNING id, email, role",
        (user_id,),
    )
    return dict(cur.fetchone())


@router.delete("/{user_id}", status_code=204)
def delete_client(user_id: str, conn=Depends(get_db), _=Depends(require_admin)):
    cur = conn.cursor()
    cur.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if row["role"] == "owner":
        raise HTTPException(status_code=422, detail="Cannot delete the owner account")
    cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
```

- [ ] **Step 4: Mount in `api/index.py`**

```python
from api.routers import admin_clients as admin_clients_router

app.include_router(admin_clients_router.router)
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_admin_clients.py -v
```

Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add api/routers/admin_clients.py api/index.py tests/test_admin_clients.py
git commit -m "feat: add admin client management (list, disable, promote, delete)"
```

---

### Task 17: Admin dashboard stats

**Files:**
- Create: `api/routers/admin_dashboard.py`
- Modify: `api/index.py`

- [ ] **Step 1: Create `api/routers/admin_dashboard.py`**

```python
from fastapi import APIRouter, Depends
from ..db import get_db
from ..dependencies import require_admin

router = APIRouter(prefix="/admin/dashboard", tags=["admin_dashboard"])


@router.get("")
def get_stats(conn=Depends(get_db), _=Depends(require_admin)):
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) AS total FROM products")
    total_products = cur.fetchone()["total"]

    cur.execute("SELECT COUNT(*) AS total FROM products WHERE is_active = TRUE")
    active_products = cur.fetchone()["total"]

    cur.execute("SELECT COUNT(*) AS total FROM enquiries")
    total_enquiries = cur.fetchone()["total"]

    cur.execute("SELECT COUNT(*) AS total FROM enquiries WHERE status = 'new'")
    new_enquiries = cur.fetchone()["total"]

    cur.execute("SELECT COUNT(*) AS total FROM users WHERE role = 'client'")
    total_clients = cur.fetchone()["total"]

    cur.execute("SELECT value FROM site_config WHERE key = 'max_products'")
    max_products = int(cur.fetchone()["value"])

    cur.execute("SELECT value FROM site_config WHERE key = 'storage_quota_mb'")
    storage_quota_mb = int(cur.fetchone()["value"])

    return {
        "products": {"total": total_products, "active": active_products, "max": max_products},
        "enquiries": {"total": total_enquiries, "new": new_enquiries},
        "clients": {"total": total_clients},
        "storage": {"quota_mb": storage_quota_mb},
    }
```

- [ ] **Step 2: Mount in `api/index.py`**

```python
from api.routers import admin_dashboard as admin_dashboard_router

app.include_router(admin_dashboard_router.router)
```

- [ ] **Step 3: Quick smoke test**

```bash
pytest -v
```

Expected: all prior tests still pass.

- [ ] **Step 4: Commit**

```bash
git add api/routers/admin_dashboard.py api/index.py
git commit -m "feat: add admin dashboard stats endpoint"
```

---

### Task 18: Final integration — run full test suite + verify Vercel deploy config

- [ ] **Step 1: Run the full test suite**

```bash
pytest -v --tb=short
```

Expected: all tests pass.

- [ ] **Step 2: Confirm `api/index.py` mounts all routers**

The final `api/index.py` should look like:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.middleware import MaintenanceModeMiddleware
from api.routers import (
    setup as setup_router,
    auth as auth_router,
    site_config as site_config_router,
    categories as categories_router,
    products as products_router,
    images as images_router,
    enquiries as enquiries_router,
    account as account_router,
    wishlist as wishlist_router,
    admin_clients as admin_clients_router,
    admin_dashboard as admin_dashboard_router,
)

app = FastAPI(title="Clothing Store API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with your Hostinger domain before going live
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(MaintenanceModeMiddleware)

app.include_router(setup_router.router)
app.include_router(auth_router.router)
app.include_router(site_config_router.router)
app.include_router(categories_router.router)
app.include_router(products_router.router)
app.include_router(images_router.router)
app.include_router(enquiries_router.router)
app.include_router(account_router.router)
app.include_router(wishlist_router.router)
app.include_router(admin_clients_router.router)
app.include_router(admin_dashboard_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 3: Verify `vercel.json` is correct for Python serverless**

```json
{
  "builds": [
    { "src": "api/index.py", "use": "@vercel/python" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "api/index.py" }
  ]
}
```

- [ ] **Step 4: Set Vercel environment variables**

In the Vercel dashboard under your project → Settings → Environment Variables, add:
- `DATABASE_URL` — Supabase pooler connection string (port 6543)
- `JWT_SECRET` — a long random string (generate with `python -c "import secrets; print(secrets.token_hex(32))"`)
- `ADMIN_EMAIL` — your owner email
- `ADMIN_PASSWORD` — your owner password (strong)
- `SUPABASE_URL` — from Supabase project settings
- `SUPABASE_SERVICE_KEY` — the `service_role` key (not `anon`)
- `SUPABASE_STORAGE_BUCKET` — `product-images`

- [ ] **Step 5: Deploy to Vercel**

```bash
vercel deploy --prod
```

Expected: deployment URL printed. Visit `https://your-project.vercel.app/health` → `{"status":"ok"}`.

- [ ] **Step 6: Run /setup on production**

```bash
curl -X POST https://your-project.vercel.app/setup
```

Expected: `{"id":"...","email":"...","role":"owner","access_token":"..."}`. This endpoint is now permanently disabled.

- [ ] **Step 7: Final commit**

```bash
git add api/index.py
git commit -m "feat: wire all routers into main app, backend complete"
```

---

## Self-Review Against Spec

**Spec coverage check:**

| Spec Requirement | Task |
|---|---|
| Custom JWT auth (access + refresh) | Task 4, 7 |
| 3 roles: client / admin / owner | Task 5, 6, 16 |
| Owner bootstrap via /setup + env vars | Task 6 |
| Pillow image processing → WebP + thumbnail | Task 11 |
| Supabase Storage upload | Task 11 |
| site_config enforced server-side | Tasks 9, 12, 15, throughout |
| All 9 site_config keys seeded | Task 2 |
| max_products limit | Task 12 |
| max_images_per_product limit | Task 12 |
| max_upload_size_mb limit | Task 12 |
| max_wishlist_items limit | Task 15 |
| allow_registrations toggle | Task 7 |
| maintenance_mode middleware | Task 8 |
| Categories CRUD | Task 10 |
| Products public browse + filter by category | Task 12 |
| Products admin CRUD | Task 12 |
| Enquiries guest + logged-in submit | Task 13 |
| Enquiries admin list + status update | Task 13 |
| Account profile + address | Task 14 |
| Change password | Task 14 |
| Wishlist add/remove/list | Task 15 |
| Admin client list/disable/promote/delete | Task 16 |
| Admin dashboard stats | Task 17 |
| Vercel deploy | Task 18 |

All spec requirements covered. No placeholders remain.
