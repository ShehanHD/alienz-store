# Collaborators Section & Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-managed Collaborators section to the homepage (featured hero cards + auto-scroll marquee strip) and replace the minimal footer with a dark full-width footer containing nav links, contact info, social icons, and a contact form.

**Architecture:** New `collaborators` DB table + FastAPI router → Zod-validated frontend API module → `CollaboratorsSection` component (pure CSS marquee, no JS) wired into `HomePage`. Footer is a full rewrite of the existing `Footer.tsx` / `Footer.module.css` files. Admin page uses the same patterns as `CategoriesPage` (drag-to-reorder via `useDragSort`, confirm dialog, toast notifications).

**Tech Stack:** Python/FastAPI, psycopg2, pytest; React/TypeScript, Zod, CSS Modules, Axios via `getApiClient()`

---

## File Map

**Create:**
- `migrations/006_collaborators.sql` — DB table
- `api/routers/collaborators.py` — CRUD + reorder endpoints
- `tests/test_collaborators.py` — backend tests
- `frontend/src/api/schemas/collaborators.ts` — Zod schema
- `frontend/src/api/collaborators.ts` — API functions
- `frontend/src/components/ui/CollaboratorsSection.tsx` — homepage section
- `frontend/src/components/ui/CollaboratorsSection.module.css` — section styles
- `frontend/src/pages/admin/CollaboratorsAdminPage.tsx` — admin CRUD page
- `frontend/src/pages/admin/CollaboratorsAdminPage.module.css` — admin page styles

**Modify:**
- `api/index.py` — register collaborators router
- `frontend/src/types/index.ts` — add `Collaborator` interface
- `frontend/src/pages/public/HomePage.tsx` — add `<CollaboratorsSection />`
- `frontend/src/components/layout/Footer.tsx` — full rewrite
- `frontend/src/components/layout/Footer.module.css` — full rewrite
- `frontend/src/App.tsx` — add `/admin/collaborators` route
- `frontend/src/components/layout/AdminLayout.tsx` — add nav link

---

## Task 1: Database Migration

**Files:**
- Create: `migrations/006_collaborators.sql`

- [ ] **Step 1: Write the migration file**

```sql
CREATE TABLE collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  instagram_url TEXT NOT NULL,
  image_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Save to `migrations/006_collaborators.sql`.

- [ ] **Step 2: Apply the migration**

```bash
psql $DATABASE_URL -f migrations/006_collaborators.sql
```

Expected: `CREATE TABLE`

- [ ] **Step 3: Apply to test DB**

```bash
psql $TEST_DATABASE_URL -f migrations/006_collaborators.sql
```

Expected: `CREATE TABLE`

- [ ] **Step 4: Commit**

```bash
git add migrations/006_collaborators.sql
git commit -m "feat: add collaborators table migration"
```

---

## Task 2: Backend Router

**Files:**
- Create: `api/routers/collaborators.py`
- Create: `tests/test_collaborators.py`
- Modify: `api/index.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_collaborators.py`:

```python
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


def test_public_collaborators_empty_by_default(client):
    r = client.get("/collaborators")
    assert r.status_code == 200
    assert r.json() == []


def test_admin_creates_collaborator(client):
    token = _owner_token(client)
    r = client.post("/admin/collaborators", json={
        "name": "Brand A",
        "instagram_url": "https://instagram.com/branda",
        "is_featured": True,
        "display_order": 0,
    }, headers=auth_header(token))
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "Brand A"
    assert body["is_featured"] is True
    assert body["image_url"] is None


def test_public_get_collaborators_returns_created(client):
    token = _owner_token(client)
    client.post("/admin/collaborators", json={
        "name": "Artist B",
        "instagram_url": "https://instagram.com/artistb",
    }, headers=auth_header(token))
    r = client.get("/collaborators")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["name"] == "Artist B"


def test_admin_updates_collaborator(client):
    token = _owner_token(client)
    created = client.post("/admin/collaborators", json={
        "name": "Brand C",
        "instagram_url": "https://instagram.com/brandc",
    }, headers=auth_header(token)).json()
    r = client.put(f"/admin/collaborators/{created['id']}", json={
        "name": "Brand C Updated",
        "instagram_url": "https://instagram.com/brandc",
        "is_featured": False,
        "display_order": 10,
    }, headers=auth_header(token))
    assert r.status_code == 200
    assert r.json()["name"] == "Brand C Updated"


def test_admin_deletes_collaborator(client):
    token = _owner_token(client)
    created = client.post("/admin/collaborators", json={
        "name": "Brand D",
        "instagram_url": "https://instagram.com/brandd",
    }, headers=auth_header(token)).json()
    r = client.delete(f"/admin/collaborators/{created['id']}", headers=auth_header(token))
    assert r.status_code == 204
    assert client.get("/collaborators").json() == []


def test_unauthenticated_cannot_create_collaborator(client):
    r = client.post("/admin/collaborators", json={
        "name": "Brand E",
        "instagram_url": "https://instagram.com/brande",
    })
    assert r.status_code in (401, 403)


def test_admin_reorder_collaborators(client):
    token = _owner_token(client)
    a = client.post("/admin/collaborators", json={"name": "A", "instagram_url": "https://instagram.com/a"}, headers=auth_header(token)).json()
    b = client.post("/admin/collaborators", json={"name": "B", "instagram_url": "https://instagram.com/b"}, headers=auth_header(token)).json()
    r = client.patch("/admin/collaborators/reorder", json=[
        {"id": a["id"], "display_order": 10},
        {"id": b["id"], "display_order": 0},
    ], headers=auth_header(token))
    assert r.status_code == 204
    listing = client.get("/collaborators").json()
    assert listing[0]["name"] == "B"
    assert listing[1]["name"] == "A"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_collaborators.py -v
```

Expected: FAIL — `404` or import error (router not yet created)

- [ ] **Step 3: Write the router**

Create `api/routers/collaborators.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from api.db import get_db
from api.dependencies import require_admin

router = APIRouter(tags=["collaborators"])


class CollaboratorIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    instagram_url: str = Field(..., min_length=1)
    image_url: Optional[str] = None
    is_featured: bool = False
    display_order: int = 0


class ReorderItem(BaseModel):
    id: str
    display_order: int


def _row(r) -> dict:
    d = dict(r)
    d["id"] = str(d["id"])
    d["created_at"] = d["created_at"].isoformat()
    return d


@router.get("/collaborators")
def list_collaborators(conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, name, instagram_url, image_url, is_featured, display_order, created_at "
            "FROM collaborators ORDER BY display_order, name"
        )
        return [_row(r) for r in cur.fetchall()]


@router.post("/admin/collaborators", status_code=201)
def create_collaborator(body: CollaboratorIn, conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO collaborators (name, instagram_url, image_url, is_featured, display_order) "
            "VALUES (%s, %s, %s, %s, %s) "
            "RETURNING id, name, instagram_url, image_url, is_featured, display_order, created_at",
            (body.name, body.instagram_url, body.image_url, body.is_featured, body.display_order),
        )
        return _row(cur.fetchone())


@router.put("/admin/collaborators/{collaborator_id}", status_code=200)
def update_collaborator(collaborator_id: str, body: CollaboratorIn, conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE collaborators SET name=%s, instagram_url=%s, image_url=%s, is_featured=%s, display_order=%s "
            "WHERE id=%s "
            "RETURNING id, name, instagram_url, image_url, is_featured, display_order, created_at",
            (body.name, body.instagram_url, body.image_url, body.is_featured, body.display_order, collaborator_id),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Collaborator not found")
    return _row(row)


@router.delete("/admin/collaborators/{collaborator_id}", status_code=204)
def delete_collaborator(collaborator_id: str, conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM collaborators WHERE id = %s", (collaborator_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Collaborator not found")


@router.patch("/admin/collaborators/reorder", status_code=204)
def reorder_collaborators(items: list[ReorderItem], conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        for item in items:
            cur.execute("UPDATE collaborators SET display_order=%s WHERE id=%s", (item.display_order, item.id))
```

- [ ] **Step 4: Register the router in `api/index.py`**

Add import and `include_router` call. Final `api/index.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import settings
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
    ref_data as ref_data_router,
    collaborators as collaborators_router,
)

app = FastAPI(title="Clothing Store API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
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
app.include_router(ref_data_router.router)
app.include_router(collaborators_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}
```

Also update `conftest.py` — add `collaborators` to the `TRUNCATE` statement in `clean_tables`:

```python
cur.execute("""
    TRUNCATE users, categories, products, product_images,
             wishlist_items, enquiries, setup_flags, collaborators RESTART IDENTITY CASCADE
""")
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/test_collaborators.py -v
```

Expected: all 7 tests PASS

- [ ] **Step 6: Run full test suite to check no regressions**

```bash
pytest -v
```

Expected: all existing tests still pass

- [ ] **Step 7: Commit**

```bash
git add api/routers/collaborators.py api/index.py tests/test_collaborators.py tests/conftest.py
git commit -m "feat: add collaborators backend router with CRUD and reorder endpoints"
```

---

## Task 3: Frontend Types, Schema & API Module

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/api/schemas/collaborators.ts`
- Create: `frontend/src/api/collaborators.ts`

- [ ] **Step 1: Add `Collaborator` interface to `frontend/src/types/index.ts`**

Add after the `Category` interface (around line 33):

```ts
export interface Collaborator {
  id: string
  name: string
  instagram_url: string
  image_url: string | null
  is_featured: boolean
  display_order: number
  created_at: string
}
```

- [ ] **Step 2: Create the Zod schema**

Create `frontend/src/api/schemas/collaborators.ts`:

```ts
import { z } from 'zod'

export const CollaboratorSchema = z.object({
  id: z.string(),
  name: z.string(),
  instagram_url: z.string(),
  image_url: z.string().nullable(),
  is_featured: z.boolean(),
  display_order: z.number(),
  created_at: z.string(),
})

export const CollaboratorsListSchema = z.array(CollaboratorSchema)
```

- [ ] **Step 3: Create the API module**

Create `frontend/src/api/collaborators.ts`:

```ts
import { getApiClient } from './client'
import { CollaboratorSchema, CollaboratorsListSchema } from './schemas/collaborators'
import type { Collaborator } from '../types'

export interface CollaboratorPayload {
  name: string
  instagram_url: string
  image_url?: string | null
  is_featured: boolean
  display_order: number
}

export async function getCollaborators(): Promise<Collaborator[]> {
  const res = await getApiClient().get('/collaborators')
  return CollaboratorsListSchema.parse(res.data)
}

export async function createCollaborator(data: CollaboratorPayload): Promise<Collaborator> {
  const res = await getApiClient().post('/admin/collaborators', data)
  return CollaboratorSchema.parse(res.data)
}

export async function updateCollaborator(id: string, data: CollaboratorPayload): Promise<Collaborator> {
  const res = await getApiClient().put(`/admin/collaborators/${id}`, data)
  return CollaboratorSchema.parse(res.data)
}

export async function deleteCollaborator(id: string): Promise<void> {
  await getApiClient().delete(`/admin/collaborators/${id}`)
}

export async function reorderCollaborators(items: { id: string; display_order: number }[]): Promise<void> {
  await getApiClient().patch('/admin/collaborators/reorder', items)
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/schemas/collaborators.ts frontend/src/api/collaborators.ts
git commit -m "feat: add Collaborator type, Zod schema, and API module"
```

---

## Task 4: CollaboratorsSection Component

**Files:**
- Create: `frontend/src/components/ui/CollaboratorsSection.tsx`
- Create: `frontend/src/components/ui/CollaboratorsSection.module.css`

- [ ] **Step 1: Create the CSS module**

Create `frontend/src/components/ui/CollaboratorsSection.module.css`:

```css
.section {
  margin-top: var(--space-12);
}

.heading {
  font-size: 0.6875rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-secondary);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-6);
}

/* Hero row — featured collaborators */
.heroRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  margin-bottom: var(--space-8);
}

.heroCard {
  position: relative;
  aspect-ratio: 16 / 9;
  background-color: #2a2a2a;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
  padding: var(--space-4);
  overflow: hidden;
  text-decoration: none;
}

.heroCard::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.55) 0%, transparent 60%);
  pointer-events: none;
}

.heroName {
  position: relative;
  color: #fff;
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

/* Auto-scroll strip — non-featured collaborators */
.stripWrap {
  overflow: hidden;
}

.strip {
  display: flex;
  gap: var(--space-8);
  width: max-content;
  animation: marquee 28s linear infinite;
}

.strip:hover {
  animation-play-state: paused;
}

@keyframes marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.stripItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.stripItem:hover {
  opacity: 1;
}

.stripImage {
  width: 70px;
  height: 70px;
  background-color: #2a2a2a;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.stripName {
  font-size: 0.55rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-secondary);
  white-space: nowrap;
}

@media (max-width: 600px) {
  .heroRow {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Create the component**

Create `frontend/src/components/ui/CollaboratorsSection.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { getCollaborators } from '../../api/collaborators'
import type { Collaborator } from '../../types'
import styles from './CollaboratorsSection.module.css'

export function CollaboratorsSection() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])

  useEffect(() => {
    void getCollaborators().then(setCollaborators).catch(() => {})
  }, [])

  if (collaborators.length === 0) return null

  const featured = collaborators.filter((c) => c.is_featured)
  const strip = collaborators.filter((c) => !c.is_featured)
  // If no non-featured exist, put everyone in the strip
  const stripItems = strip.length > 0 ? strip : (featured.length === 0 ? collaborators : strip)

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Collaborators</h2>

      {featured.length > 0 && (
        <div className={styles.heroRow}>
          {featured.map((c) => (
            <a
              key={c.id}
              href={c.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.heroCard}
              style={c.image_url ? { backgroundImage: `url(${c.image_url})` } : undefined}
            >
              <span className={styles.heroName}>{c.name}</span>
            </a>
          ))}
        </div>
      )}

      {stripItems.length > 0 && (
        <div className={styles.stripWrap}>
          {/* List duplicated for seamless infinite loop */}
          <div className={styles.strip}>
            {[...stripItems, ...stripItems].map((c, i) => (
              <a
                key={`${c.id}-${i}`}
                href={c.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.stripItem}
              >
                <div
                  className={styles.stripImage}
                  style={c.image_url ? { backgroundImage: `url(${c.image_url})` } : undefined}
                />
                <span className={styles.stripName}>{c.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/CollaboratorsSection.tsx frontend/src/components/ui/CollaboratorsSection.module.css
git commit -m "feat: add CollaboratorsSection component with hero cards and marquee strip"
```

---

## Task 5: Wire CollaboratorsSection into HomePage

**Files:**
- Modify: `frontend/src/pages/public/HomePage.tsx`

- [ ] **Step 1: Add the import and render the section**

In `frontend/src/pages/public/HomePage.tsx`, add the import at the top and render `<CollaboratorsSection />` inside `.page` after the featured products section.

Replace the `HomePage` function body with:

```tsx
import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getProducts } from '../../api/products'
import { ProductCard } from '../../components/ui/ProductCard'
import { CollaboratorsSection } from '../../components/ui/CollaboratorsSection'
import type { Product } from '../../types'
import styles from './HomePage.module.css'
```

And the `HomePage` component:

```tsx
export function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([])
  const [slides, setSlides] = useState<string[]>([])

  useEffect(() => {
    void getProducts({ page: 1, page_size: 8 }).then((r) => {
      setFeatured(r.items.slice(0, 4))
      const imgs = r.items
        .flatMap((p) => p.images)
        .filter((img) => img.url)
        .map((img) => img.url)
        .slice(0, 6)
      setSlides(imgs)
    })
  }, [])

  return (
    <>
      <HeroCarousel slides={slides} />

      <div className={styles.page}>
        {featured.length > 0 && (
          <section className={styles.featured}>
            <h2>Featured</h2>
            <div className={styles.grid}>
              {featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        <CollaboratorsSection />
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/public/HomePage.tsx
git commit -m "feat: render CollaboratorsSection on homepage below featured products"
```

---

## Task 6: Footer Rewrite

**Files:**
- Modify: `frontend/src/components/layout/Footer.tsx` — full rewrite
- Modify: `frontend/src/components/layout/Footer.module.css` — full rewrite

- [ ] **Step 1: Rewrite `Footer.module.css`**

```css
.footer {
  background: #111;
  color: #fff;
  padding: var(--space-10) var(--space-8) 0;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--space-10);
}

/* Left column */
.info {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.colTitle {
  font-size: 0.55rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #666;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid #333;
}

.navLink {
  display: block;
  color: #ccc;
  text-decoration: none;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  transition: color 0.15s;
}

.navLink:hover {
  color: #fff;
}

.contactText {
  display: block;
  color: #ccc;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-decoration: none;
}

.contactText:hover {
  color: #fff;
}

.social {
  display: flex;
  gap: var(--space-3);
}

.socialBtn {
  width: 32px;
  height: 32px;
  border: 1px solid #444;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  text-decoration: none;
}

.socialBtn:hover {
  color: #fff;
  border-color: #888;
}

/* Right column — contact form */
.formCol {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.formTitle {
  font-size: 0.55rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #666;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid #333;
}

.input,
.textarea {
  width: 100%;
  background: #1a1a1a;
  border: 1px solid #333;
  padding: var(--space-2) var(--space-3);
  color: #ccc;
  font-size: 0.65rem;
  font-family: var(--font-body);
  letter-spacing: 0.04em;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s;
}

.input:focus,
.textarea:focus {
  border-color: #666;
}

.textarea {
  height: 80px;
  resize: vertical;
}

.submitBtn {
  align-self: flex-start;
  background: transparent;
  border: 1px solid #555;
  color: #ccc;
  font-size: 0.55rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: var(--space-2) var(--space-5);
  cursor: pointer;
  font-family: var(--font-body);
  transition: color 0.15s, border-color 0.15s;
}

.submitBtn:hover:not(:disabled) {
  color: #fff;
  border-color: #aaa;
}

.submitBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.successMsg {
  font-size: 0.65rem;
  color: #aaa;
  letter-spacing: 0.06em;
}

.errorMsg {
  font-size: 0.65rem;
  color: #c77;
  letter-spacing: 0.04em;
}

/* Bottom bar */
.copyright {
  border-top: 1px solid #222;
  margin-top: var(--space-10);
  padding: var(--space-4) 0;
  text-align: center;
  font-size: 0.55rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #444;
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Rewrite `Footer.tsx`**

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Instagram } from 'lucide-react'
import { submitEnquiry } from '../../api/enquiries'
import styles from './Footer.module.css'

const PHONE = '+1 234 567 8900'        // update to real number
const EMAIL = 'hello@alienz.com'       // update to real email
const INSTAGRAM_URL = 'https://instagram.com/alienzstore'
const TIKTOK_URL = 'https://tiktok.com/@alienzstore'

function TikTokIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
    </svg>
  )
}

export function Footer() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await submitEnquiry({ name, email, phone: '', message })
      setSent(true)
      setName('')
      setEmail('')
      setMessage('')
    } catch {
      setError('Failed to send. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>

        {/* Left — info */}
        <div className={styles.info}>
          <div className={styles.block}>
            <p className={styles.colTitle}>Navigate</p>
            <Link to="/shop" className={styles.navLink}>Shop</Link>
            <Link to="/contact" className={styles.navLink}>Contact</Link>
          </div>

          <div className={styles.block}>
            <p className={styles.colTitle}>Get in Touch</p>
            <a href={`tel:${PHONE.replace(/\s/g, '')}`} className={styles.contactText}>{PHONE}</a>
            <a href={`mailto:${EMAIL}`} className={styles.contactText}>{EMAIL}</a>
          </div>

          <div className={styles.block}>
            <p className={styles.colTitle}>Follow</p>
            <div className={styles.social}>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialBtn}
                aria-label="Instagram"
              >
                <Instagram size={14} strokeWidth={1.5} aria-hidden="true" />
              </a>
              <a
                href={TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialBtn}
                aria-label="TikTok"
              >
                <TikTokIcon />
              </a>
            </div>
          </div>
        </div>

        {/* Right — contact form */}
        <form onSubmit={(e) => void handleSubmit(e)} className={styles.formCol}>
          <p className={styles.formTitle}>Send a Message</p>
          <input
            className={styles.input}
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <textarea
            className={styles.textarea}
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          {sent && <p className={styles.successMsg}>Message sent — we&apos;ll be in touch.</p>}
          {error && <p className={styles.errorMsg}>{error}</p>}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Sending…' : 'Send Message'}
          </button>
        </form>

      </div>

      <p className={styles.copyright}>© {new Date().getFullYear()} AlienzStore</p>
    </footer>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/Footer.tsx frontend/src/components/layout/Footer.module.css
git commit -m "feat: rewrite Footer with dark layout, nav links, contact info, social icons, and contact form"
```

---

## Task 7: Admin Page — Collaborators

**Files:**
- Create: `frontend/src/pages/admin/CollaboratorsAdminPage.tsx`
- Create: `frontend/src/pages/admin/CollaboratorsAdminPage.module.css`

- [ ] **Step 1: Create the CSS module**

Create `frontend/src/pages/admin/CollaboratorsAdminPage.module.css`:

```css
.page {
  padding: var(--space-6);
  max-width: 900px;
}

.page h1 {
  font-size: 1.1rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  margin-bottom: var(--space-6);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: var(--space-5);
  margin-bottom: var(--space-8);
}

.formTitle {
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.checkRow {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.75rem;
}

.formActions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.tableWrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
}

.table th {
  text-align: left;
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border);
  font-weight: 400;
}

.table td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.table tr:hover td {
  background: var(--bg-secondary);
}

.rowDragging td {
  background: var(--bg-secondary);
  opacity: 0.6;
}

.dragCell {
  width: 28px;
  cursor: grab;
  color: var(--text-secondary);
}

.thumb {
  width: 40px;
  height: 40px;
  background: var(--bg-secondary);
  background-size: cover;
  background-position: center;
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.thumbCell {
  width: 56px;
}

.badge {
  display: inline-block;
  font-size: 0.5rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 2px 6px;
  background: var(--gold);
  color: #fff;
}

.actionsCell {
  text-align: right;
  white-space: nowrap;
}

.iconBtn {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-1);
  color: var(--text-secondary);
  transition: color 0.15s;
}

.iconBtn:hover {
  color: var(--text-primary);
}

.iconBtnDanger:hover {
  color: #c0392b;
}

.empty {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.error {
  color: #c0392b;
  font-size: 0.75rem;
}
```

- [ ] **Step 2: Create the admin page component**

Create `frontend/src/pages/admin/CollaboratorsAdminPage.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react'
import { Trash2, Pencil, Plus, X } from 'lucide-react'
import {
  getCollaborators,
  createCollaborator,
  updateCollaborator,
  deleteCollaborator,
  reorderCollaborators,
} from '../../api/collaborators'
import type { CollaboratorPayload } from '../../api/collaborators'
import { Button } from '../../components/ui/Button'
import { PageLoader } from '../../components/ui/PageLoader'
import { ImageUploader } from '../../components/ui/ImageUploader'
import { useDragSort } from '../../hooks/useDragSort'
import { useToast } from '../../contexts/ToastContext'
import { useConfirm } from '../../contexts/ConfirmContext'
import type { Collaborator } from '../../types'
import styles from './CollaboratorsAdminPage.module.css'

function DragIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden="true">
      <circle cx="4" cy="3" r="1.5" fill="currentColor"/>
      <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
      <circle cx="4" cy="8" r="1.5" fill="currentColor"/>
      <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
      <circle cx="4" cy="13" r="1.5" fill="currentColor"/>
      <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
    </svg>
  )
}

const EMPTY_FORM: CollaboratorPayload = {
  name: '',
  instagram_url: '',
  image_url: null,
  is_featured: false,
  display_order: 0,
}

export function CollaboratorsAdminPage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [form, setForm] = useState<CollaboratorPayload>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const { toast } = useToast()
  const confirm = useConfirm()

  const { items: collaborators, sync, draggingId, onDragStart, onDragOver, onDragEnd } =
    useDragSort<Collaborator>([], async (reordered) => {
      try {
        await reorderCollaborators(reordered.map((c, i) => ({ id: c.id, display_order: i * 10 })))
      } catch { /* non-critical */ }
    })

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    getCollaborators()
      .then(sync)
      .catch(() => setLoadError('Failed to load collaborators. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function startEdit(c: Collaborator) {
    setEditingId(c.id)
    setForm({
      name: c.name,
      instagram_url: c.instagram_url,
      image_url: c.image_url,
      is_featured: c.is_featured,
      display_order: c.display_order,
    })
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingId) {
        await updateCollaborator(editingId, form)
        toast('Collaborator updated.', 'success')
      } else {
        await createCollaborator({ ...form, display_order: collaborators.length * 10 })
        toast('Collaborator added.', 'success')
      }
      cancelForm()
      load()
    } catch {
      toast('Failed to save collaborator. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm('Delete this collaborator?', {
      title: 'Delete Collaborator',
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteCollaborator(id)
      toast('Collaborator deleted.', 'success')
      load()
    } catch {
      toast('Failed to delete collaborator. Please try again.', 'error')
    }
  }

  if (loading) return <PageLoader />
  if (loadError) return <p role="alert" className={styles.error}>{loadError}</p>

  return (
    <div className={styles.page}>
      <h1>Collaborators</h1>

      {!showForm && (
        <Button onClick={() => setShowForm(true)}>
          <Plus size={13} strokeWidth={1.5} aria-hidden="true" /> Add Collaborator
        </Button>
      )}

      {showForm && (
        <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>
          <p className={styles.formTitle}>{editingId ? 'Edit Collaborator' : 'New Collaborator'}</p>

          <div className={styles.row}>
            <div>
              <label>Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label>Instagram URL</label>
              <input
                type="url"
                value={form.instagram_url}
                onChange={(e) => setForm((f) => ({ ...f, instagram_url: e.target.value }))}
                required
              />
            </div>
          </div>

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
            />
            Featured (hero card)
          </label>

          <ImageUploader
            currentUrl={form.image_url ?? undefined}
            folder="collaborators"
            onUploaded={(url) => setForm((f) => ({ ...f, image_url: url }))}
            onRemoved={() => setForm((f) => ({ ...f, image_url: null }))}
          />

          <div className={styles.formActions}>
            <Button type="submit" loading={submitting}>
              {editingId ? 'Save Changes' : 'Add Collaborator'}
            </Button>
            <Button type="button" variant="ghost" onClick={cancelForm}>
              <X size={13} strokeWidth={1.5} aria-hidden="true" /> Cancel
            </Button>
          </div>
        </form>
      )}

      {collaborators.length === 0 ? (
        <p className={styles.empty}>No collaborators yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th />
                <th />
                <th>Name</th>
                <th>Instagram</th>
                <th>Featured</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {collaborators.map((c, index) => (
                <tr
                  key={c.id}
                  className={draggingId === c.id ? styles.rowDragging : undefined}
                  draggable
                  onDragStart={() => onDragStart(index)}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDragEnd={onDragEnd}
                >
                  <td className={styles.dragCell}><DragIcon /></td>
                  <td className={styles.thumbCell}>
                    <div
                      className={styles.thumb}
                      style={c.image_url ? { backgroundImage: `url(${c.image_url})` } : undefined}
                    />
                  </td>
                  <td>{c.name}</td>
                  <td>
                    <a href={c.instagram_url} target="_blank" rel="noopener noreferrer">
                      {c.instagram_url}
                    </a>
                  </td>
                  <td>{c.is_featured && <span className={styles.badge}>Featured</span>}</td>
                  <td className={styles.actionsCell}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => startEdit(c)}
                      title="Edit"
                      aria-label="Edit collaborator"
                    >
                      <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      onClick={() => void handleDelete(c.id)}
                      title="Delete"
                      aria-label="Delete collaborator"
                    >
                      <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/CollaboratorsAdminPage.tsx frontend/src/pages/admin/CollaboratorsAdminPage.module.css
git commit -m "feat: add CollaboratorsAdminPage with CRUD, drag-to-reorder, and image upload"
```

---

## Task 8: Wire Admin Route & Nav Link

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/AdminLayout.tsx`

- [ ] **Step 1: Add the route in `App.tsx`**

Add the import at the top of `App.tsx`:

```ts
import { CollaboratorsAdminPage } from './pages/admin/CollaboratorsAdminPage'
```

Add the route inside the `<RequireAdmin>` / `<AdminLayout>` block, after the categories route:

```tsx
<Route path="/admin/collaborators" element={<CollaboratorsAdminPage />} />
```

The full routes block inside `<AdminLayout>` should look like:

```tsx
<Route element={<RequireAdmin />}>
  <Route element={<AdminLayout />}>
    <Route path="/admin" element={<AdminDashboardPage />} />
    <Route path="/admin/products" element={<ProductsPage />} />
    <Route path="/admin/products/new" element={<ProductFormPage />} />
    <Route path="/admin/products/:id" element={<ProductFormPage />} />
    <Route path="/admin/categories" element={<CategoriesPage />} />
    <Route path="/admin/collaborators" element={<CollaboratorsAdminPage />} />
    <Route path="/admin/enquiries" element={<EnquiriesPage />} />
    <Route path="/admin/clients" element={<ClientsPage />} />
    <Route path="/admin/colors-sizes" element={<ColorsAndSizesPage />} />
    <Route path="/admin/attributes" element={<AttributesPage />} />
    <Route element={<RequireOwner />}>
      <Route path="/admin/settings" element={<SettingsPage />} />
    </Route>
  </Route>
</Route>
```

- [ ] **Step 2: Add the nav link in `AdminLayout.tsx`**

In `AdminLayout.tsx`, import `Users2` from lucide-react and add the Collaborators entry to the `NAV` array. Update the imports line:

```ts
import {
  LayoutDashboard, Package, Tag, Palette,
  MessageSquare, Users, Settings, ArrowLeft, Menu, X, Sliders, Users2,
} from 'lucide-react'
```

Add to the `NAV` array after Categories:

```ts
const NAV = [
  { to: '/admin',                   end: true,  icon: LayoutDashboard, label: 'Dashboard'      },
  { to: '/admin/products',                      icon: Package,         label: 'Products'       },
  { to: '/admin/categories',                    icon: Tag,             label: 'Categories'     },
  { to: '/admin/collaborators',                 icon: Users2,          label: 'Collaborators'  },
  { to: '/admin/colors-sizes',                  icon: Palette,         label: 'Colors & Sizes' },
  { to: '/admin/attributes',                    icon: Sliders,         label: 'Attributes'     },
  { to: '/admin/enquiries',                     icon: MessageSquare,   label: 'Enquiries'      },
  { to: '/admin/clients',                       icon: Users,           label: 'Clients'        },
]
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Smoke test the full app**

```bash
# Terminal 1
uvicorn api.index:app --reload

# Terminal 2
cd frontend && npm run dev
```

Open `http://localhost:5173`:
- Homepage renders — Collaborators section shows nothing (no data yet)
- Footer renders with nav links, phone, email, social icons, and contact form
- Log in as admin → `/admin/collaborators` appears in the sidebar
- Add a collaborator (non-featured) → homepage strip appears
- Add a featured collaborator → hero card appears on homepage

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/layout/AdminLayout.tsx
git commit -m "feat: wire /admin/collaborators route and add sidebar nav link"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] DB table with all columns (`id`, `name`, `instagram_url`, `image_url`, `is_featured`, `display_order`, `created_at`)
- [x] Public GET endpoint returns collaborators ordered by `display_order`
- [x] Admin CRUD + reorder endpoints, all behind `require_admin`
- [x] `_row()` normalises UUID to str and datetime to isoformat
- [x] Zod schema with `image_url: z.string().nullable()`
- [x] `CollaboratorsSection` renders nothing when list is empty
- [x] Hero row uses `#2a2a2a` placeholder when `image_url` is null
- [x] Strip items use `#2a2a2a` placeholder when `image_url` is null
- [x] CSS `@keyframes` marquee, list duplicated in DOM for seamless loop
- [x] Each card/strip item is an `<a>` with `target="_blank" rel="noopener noreferrer"`
- [x] Footer: dark `#111` background, 3-col grid (info left, form spans right)
- [x] Footer: Navigate, Get in Touch, Follow blocks in left column
- [x] Footer: Contact form reuses `submitEnquiry` (passes `phone: ''`)
- [x] Footer: inline success/error messages, no page navigation on submit
- [x] Footer: hardcoded constants at top of file
- [x] Footer: copyright bar `© {year} AlienzStore` with `border-top: 1px solid #222`
- [x] Admin page: list, add/edit inline form, delete with confirm, drag-to-reorder
- [x] Admin nav link added to `AdminLayout.tsx`
- [x] Route `/admin/collaborators` wrapped in `RequireAdmin`
- [x] `conftest.py` updated to truncate `collaborators` table between tests

**Type consistency:** `CollaboratorPayload` used in `api/collaborators.ts` matches `CollaboratorIn` on the backend. `Collaborator` interface in `types/index.ts` matches `CollaboratorSchema` in Zod.
