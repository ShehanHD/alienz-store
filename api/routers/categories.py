import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.db import get_db
from api.dependencies import require_admin

router = APIRouter(tags=["categories"])


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not slug:
        raise HTTPException(status_code=422, detail="Name must contain at least one letter or digit")
    return slug


class CategoryIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    sort_order: int = 0


@router.get("/categories")
def list_categories(conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute("SELECT id, name, slug, sort_order FROM categories ORDER BY sort_order, name")
        return [dict(r) for r in cur.fetchall()]


@router.post("/admin/categories", status_code=201)
def create_category(body: CategoryIn, conn=Depends(get_db), _=Depends(require_admin)):
    slug = _slugify(body.name)
    with conn.cursor() as cur:
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
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM categories WHERE slug = %s AND id != %s", (slug, category_id))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Category with this name already exists")
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
    with conn.cursor() as cur:
        cur.execute("DELETE FROM categories WHERE id = %s", (category_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Category not found")
