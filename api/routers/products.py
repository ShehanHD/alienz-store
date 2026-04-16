import re
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional

from api.db import get_db
from api.dependencies import require_admin, get_config
from api.storage import delete_files
from api.config import settings

router = APIRouter(tags=["products"])


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def _parse_uuid_array(val) -> list[str]:
    """Safely convert psycopg2 uuid[] — either a Python list or a raw PG string."""
    if not val:
        return []
    if isinstance(val, str):
        # Raw PostgreSQL array string: '{uuid1,uuid2}' → ['uuid1', 'uuid2']
        val = val.strip("{}")
        return [v.strip() for v in val.split(",") if v.strip()]
    return [str(c) for c in val]


def _normalise_product_row(row: dict) -> dict:
    """Convert all psycopg2 types to JSON-safe Python primitives."""
    row["id"] = str(row["id"])
    row["category_id"] = str(row["category_id"]) if row.get("category_id") else None
    row["category_ids"] = _parse_uuid_array(row.get("category_ids"))
    row["price"] = float(row["price"])
    row["is_active"] = bool(row.get("is_active", False))
    row["is_featured"] = bool(row.get("is_featured", False))
    row["sizes"] = list(row.get("sizes") or [])
    row["colors"] = list(row.get("colors") or [])
    row["models"] = list(row.get("models") or [])
    row["fits"] = list(row.get("fits") or [])
    row["materials"] = list(row.get("materials") or [])
    row["accessory_styles"] = list(row.get("accessory_styles") or [])
    row["description"] = row.get("description") or ""
    row["created_at"] = row["created_at"].isoformat() if row.get("created_at") else ""
    row["updated_at"] = row["updated_at"].isoformat() if row.get("updated_at") else ""

    thumb_id = row.pop("primary_image_id", None)
    primary_url = row.pop("primary_url", None)
    primary_thumb = row.pop("primary_thumbnail", None)
    row["images"] = (
        [{
            "id": str(thumb_id),
            "product_id": row["id"],
            "url": primary_url or "",
            "thumbnail_url": primary_thumb or "",
            "is_primary": True,
            "sort_order": 0,
        }]
        if thumb_id else []
    )

    return row


class ProductIn(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    price: float
    category_ids: list[str] = []
    sizes: list[str] = []
    colors: list[str] = []
    models: list[str] = []
    fits: list[str] = []
    materials: list[str] = []
    accessory_styles: list[str] = []
    is_active: bool = False
    is_featured: bool = False

    @property
    def primary_category_id(self) -> Optional[str]:
        return self.category_ids[0] if self.category_ids else None


@router.get("/products")
def list_products(
    category: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    color: Optional[str] = Query(None),
    size: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    conn=Depends(get_db),
):
    params: list = []
    where = "WHERE p.is_active = TRUE"
    if category:
        where += " AND EXISTS (SELECT 1 FROM categories cx WHERE cx.id = ANY(p.category_ids) AND cx.slug = %s)"
        params.append(category)
    if min_price is not None:
        where += " AND p.price >= %s"
        params.append(min_price)
    if max_price is not None:
        where += " AND p.price <= %s"
        params.append(max_price)
    if color:
        color_list = [c.strip() for c in color.split(",") if c.strip()]
        if color_list:
            where += " AND p.colors && %s::text[]"
            params.append(color_list)
    if size:
        size_list = [s.strip() for s in size.split(",") if s.strip()]
        if size_list:
            where += " AND p.sizes && %s::text[]"
            params.append(size_list)
    offset = (page - 1) * page_size
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT p.id, p.name, p.slug, p.description, p.price,
                   p.sizes, p.colors, p.models, p.fits, p.materials, p.accessory_styles,
                   p.is_active, p.is_featured,
                   p.category_id, p.category_ids, c.name AS category_name,
                   p.created_at, p.updated_at,
                   pi.id AS primary_image_id,
                   pi.url AS primary_url,
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
        items = [_normalise_product_row(dict(r)) for r in cur.fetchall()]
        cur.execute(
            f"SELECT COUNT(*) AS total FROM products p LEFT JOIN categories c ON c.id = p.category_id {where}",
            params,
        )
        total = cur.fetchone()["total"]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/products/filters")
def get_product_filters(conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute("SELECT name, hex FROM ref_colors ORDER BY sort_order, name")
        colors = [dict(r) for r in cur.fetchall()]
        cur.execute("SELECT name FROM ref_sizes ORDER BY sort_order, name")
        sizes = [r["name"] for r in cur.fetchall()]
    return {"colors": colors, "sizes": sizes}


@router.get("/products/{slug}")
def get_product(slug: str, conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT p.id, p.name, p.slug, p.description, p.price,
                   p.sizes, p.colors, p.models, p.fits, p.materials, p.accessory_styles,
                   p.is_active, p.is_featured,
                   p.category_id, p.category_ids,
                   p.created_at, p.updated_at
            FROM products p
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
        images = cur.fetchall()
    result = dict(product)
    result["id"] = str(result["id"])
    result["category_id"] = str(result["category_id"]) if result.get("category_id") else None
    result["category_ids"] = _parse_uuid_array(result.get("category_ids"))
    result["price"] = float(result["price"])
    result["is_active"] = bool(result.get("is_active", False))
    result["is_featured"] = bool(result.get("is_featured", False))
    result["sizes"] = list(result.get("sizes") or [])
    result["colors"] = list(result.get("colors") or [])
    result["models"] = list(result.get("models") or [])
    result["fits"] = list(result.get("fits") or [])
    result["materials"] = list(result.get("materials") or [])
    result["accessory_styles"] = list(result.get("accessory_styles") or [])
    result["description"] = result.get("description") or ""
    result["created_at"] = result["created_at"].isoformat() if result.get("created_at") else ""
    result["updated_at"] = result["updated_at"].isoformat() if result.get("updated_at") else ""
    result["images"] = [
        {
            "id": str(img["id"]),
            "product_id": result["id"],
            "url": img["url"],
            "thumbnail_url": img["thumbnail_url"],
            "is_primary": bool(img["is_primary"]),
            "sort_order": int(img["sort_order"]),
        }
        for img in images
    ]
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
            SELECT p.id, p.name, p.slug, p.description, p.price,
                   p.sizes, p.colors, p.models, p.fits, p.materials, p.accessory_styles,
                   p.is_active, p.is_featured,
                   p.category_id, p.category_ids, c.name AS category_name,
                   p.created_at, p.updated_at,
                   pi.id AS primary_image_id,
                   pi.url AS primary_url,
                   pi.thumbnail_url AS primary_thumbnail
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
            ORDER BY p.created_at DESC
            LIMIT %s OFFSET %s
            """,
            (page_size, offset),
        )
        items = [_normalise_product_row(dict(r)) for r in cur.fetchall()]
        cur.execute("SELECT COUNT(*) AS total FROM products")
        total = cur.fetchone()["total"]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/admin/products/{product_id}")
def admin_get_product(product_id: str, conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT p.id, p.name, p.slug, p.description, p.price,
                   p.sizes, p.colors, p.models, p.fits, p.materials, p.accessory_styles,
                   p.is_active, p.is_featured,
                   p.category_id, p.category_ids,
                   p.created_at, p.updated_at
            FROM products p
            WHERE p.id = %s
            """,
            (product_id,),
        )
        product = cur.fetchone()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        cur.execute(
            "SELECT id, url, thumbnail_url, is_primary, sort_order "
            "FROM product_images WHERE product_id = %s ORDER BY sort_order",
            (product_id,),
        )
        images = cur.fetchall()
    result = dict(product)
    result["id"] = str(result["id"])
    result["category_id"] = str(result["category_id"]) if result.get("category_id") else None
    result["category_ids"] = _parse_uuid_array(result.get("category_ids"))
    result["price"] = float(result["price"])
    result["is_active"] = bool(result.get("is_active", False))
    result["is_featured"] = bool(result.get("is_featured", False))
    result["sizes"] = list(result.get("sizes") or [])
    result["colors"] = list(result.get("colors") or [])
    result["models"] = list(result.get("models") or [])
    result["fits"] = list(result.get("fits") or [])
    result["materials"] = list(result.get("materials") or [])
    result["accessory_styles"] = list(result.get("accessory_styles") or [])
    result["description"] = result.get("description") or ""
    result["created_at"] = result["created_at"].isoformat() if result.get("created_at") else ""
    result["updated_at"] = result["updated_at"].isoformat() if result.get("updated_at") else ""
    result["images"] = [
        {
            "id": str(img["id"]),
            "product_id": result["id"],
            "url": img["url"],
            "thumbnail_url": img["thumbnail_url"],
            "is_primary": bool(img["is_primary"]),
            "sort_order": int(img["sort_order"]),
        }
        for img in images
    ]
    return result


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
            INSERT INTO products (name, slug, description, price, category_id, category_ids, sizes, colors, models, fits, materials, accessory_styles, is_active, is_featured)
            VALUES (%s, %s, %s, %s, %s, %s::uuid[], %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, name, slug, description, price, category_id, category_ids, sizes, colors, models, fits, materials, accessory_styles, is_active, is_featured, created_at, updated_at
            """,
            (body.name, slug, body.description, body.price,
             body.primary_category_id, body.category_ids,
             body.sizes, body.colors, body.models, body.fits, body.materials, body.accessory_styles,
             body.is_active, body.is_featured),
        )
        row = dict(cur.fetchone())
    row["id"] = str(row["id"])
    row["category_id"] = str(row["category_id"]) if row.get("category_id") else None
    row["category_ids"] = _parse_uuid_array(row.get("category_ids"))
    row["price"] = float(row["price"])
    row["created_at"] = row["created_at"].isoformat() if row.get("created_at") else ""
    row["updated_at"] = row["updated_at"].isoformat() if row.get("updated_at") else ""
    row["images"] = []
    return row


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
            "SELECT id FROM products WHERE slug = %s AND id != %s",
            (slug, product_id)
        )
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="A product with this name already exists")
        cur.execute(
            """
            UPDATE products SET name=%s, slug=%s, description=%s, price=%s,
                category_id=%s, category_ids=%s::uuid[], sizes=%s, colors=%s,
                models=%s, fits=%s, materials=%s, accessory_styles=%s,
                is_active=%s, is_featured=%s, updated_at=NOW()
            WHERE id=%s
            RETURNING id, name, slug, description, price, category_id, category_ids,
                      sizes, colors, models, fits, materials, accessory_styles,
                      is_active, is_featured, created_at, updated_at
            """,
            (body.name, slug, body.description, body.price,
             body.primary_category_id, body.category_ids,
             body.sizes, body.colors, body.models, body.fits, body.materials, body.accessory_styles,
             body.is_active, body.is_featured, product_id),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    result = dict(row)
    result["id"] = str(result["id"])
    result["category_id"] = str(result["category_id"]) if result.get("category_id") else None
    result["category_ids"] = _parse_uuid_array(result.get("category_ids"))
    result["price"] = float(result["price"])
    result["created_at"] = result["created_at"].isoformat() if result.get("created_at") else ""
    result["updated_at"] = result["updated_at"].isoformat() if result.get("updated_at") else ""
    result["images"] = []
    return result


@router.delete("/admin/products/{product_id}", status_code=204)
def delete_product(product_id: str, conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT url, thumbnail_url FROM product_images WHERE product_id = %s",
            (product_id,),
        )
        image_rows = cur.fetchall()
        cur.execute("DELETE FROM products WHERE id = %s", (product_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Product not found")
    _delete_product_images(image_rows)


def _delete_product_images(image_rows: list) -> None:
    prefix = f"/storage/v1/object/public/{settings.supabase_storage_bucket}/"
    paths = []
    for row in image_rows:
        for url in (row.get("url"), row.get("thumbnail_url")):
            if url and prefix in url:
                paths.append(url.split(prefix, 1)[1])
    if paths:
        try:
            delete_files(paths)
        except Exception:
            pass
