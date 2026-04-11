import re
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional

from api.db import get_db
from api.dependencies import require_admin, get_config

router = APIRouter(tags=["products"])


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


class ProductIn(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    price: float
    category_id: Optional[str] = None
    sizes: list[str] = []
    colors: list[str] = []
    is_active: bool = False


@router.get("/products")
def list_products(
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    conn=Depends(get_db),
):
    params: list = []
    where = "WHERE p.is_active = TRUE"
    if category:
        where += " AND c.slug = %s"
        params.append(category)
    offset = (page - 1) * page_size
    with conn.cursor() as cur:
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
    with conn.cursor() as cur:
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


@router.get("/admin/products")
def admin_list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    offset = (page - 1) * page_size
    with conn.cursor() as cur:
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
    with conn.cursor() as cur:
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
    with conn.cursor() as cur:
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
    with conn.cursor() as cur:
        cur.execute("DELETE FROM products WHERE id = %s", (product_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Product not found")
