from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.db import get_db
from api.dependencies import require_admin

router = APIRouter(tags=["ref-data"])


class RefColorIn(BaseModel):
    name: str = Field(min_length=1)
    hex: str = Field(min_length=4, max_length=9, pattern=r'^#[0-9a-fA-F]{3,8}$')


class RefSizeIn(BaseModel):
    name: str = Field(min_length=1)


class ReorderItem(BaseModel):
    id: str
    sort_order: int


# ── Colors ──────────────────────────────────────────────────────────────────


@router.get("/admin/ref/colors")
def list_colors(conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, name, hex, sort_order FROM ref_colors ORDER BY sort_order, name"
        )
        return [dict(r) for r in cur.fetchall()]


@router.post("/admin/ref/colors", status_code=201)
def add_color(body: RefColorIn, conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ref_colors (name, hex)
            VALUES (%s, %s)
            ON CONFLICT (name) DO NOTHING
            RETURNING id, name, hex, sort_order
            """,
            (body.name.strip(), body.hex.lower()),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=409, detail="Color already exists")
        return dict(row)


@router.patch("/admin/ref/colors/reorder", status_code=204)
def reorder_colors(items: list[ReorderItem], conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        for item in items:
            cur.execute("UPDATE ref_colors SET sort_order=%s WHERE id=%s", (item.sort_order, item.id))


@router.delete("/admin/ref/colors/{color_id}", status_code=204)
def delete_color(color_id: str, conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM ref_colors WHERE id = %s", (color_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Color not found")


# ── Sizes ────────────────────────────────────────────────────────────────────


@router.get("/admin/ref/sizes")
def list_sizes(conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, name, sort_order FROM ref_sizes ORDER BY sort_order, name"
        )
        return [dict(r) for r in cur.fetchall()]


@router.post("/admin/ref/sizes", status_code=201)
def add_size(body: RefSizeIn, conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ref_sizes (name)
            VALUES (%s)
            ON CONFLICT (name) DO NOTHING
            RETURNING id, name, sort_order
            """,
            (body.name.strip(),),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=409, detail="Size already exists")
        return dict(row)


@router.patch("/admin/ref/sizes/reorder", status_code=204)
def reorder_sizes(items: list[ReorderItem], conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        for item in items:
            cur.execute("UPDATE ref_sizes SET sort_order=%s WHERE id=%s", (item.sort_order, item.id))


# ── Generic Attributes (Model, Fit, Material, Accessory Style) ────────────

VALID_ATTRIBUTE_TYPES = {"model", "fit", "material", "accessory_style"}


class RefAttributeIn(BaseModel):
    type: str = Field(min_length=1)
    name: str = Field(min_length=1)


@router.get("/admin/ref/attributes")
def list_attributes(type: str, conn=Depends(get_db), _=Depends(require_admin)):
    if type not in VALID_ATTRIBUTE_TYPES:
        raise HTTPException(status_code=422, detail=f"Invalid type. Must be one of: {', '.join(VALID_ATTRIBUTE_TYPES)}")
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, type, name, sort_order FROM ref_attributes WHERE type = %s ORDER BY sort_order, name",
            (type,),
        )
        return [dict(r) for r in cur.fetchall()]


@router.post("/admin/ref/attributes", status_code=201)
def add_attribute(body: RefAttributeIn, conn=Depends(get_db), _=Depends(require_admin)):
    if body.type not in VALID_ATTRIBUTE_TYPES:
        raise HTTPException(status_code=422, detail=f"Invalid type")
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ref_attributes (type, name)
            VALUES (%s, %s)
            ON CONFLICT (type, name) DO NOTHING
            RETURNING id, type, name, sort_order
            """,
            (body.type, body.name.strip()),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=409, detail="Attribute already exists")
        return dict(row)


@router.patch("/admin/ref/attributes/reorder", status_code=204)
def reorder_attributes(items: list[ReorderItem], conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        for item in items:
            cur.execute("UPDATE ref_attributes SET sort_order=%s WHERE id=%s", (item.sort_order, item.id))


@router.delete("/admin/ref/attributes/{attribute_id}", status_code=204)
def delete_attribute(attribute_id: str, conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM ref_attributes WHERE id = %s", (attribute_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Attribute not found")


@router.delete("/admin/ref/sizes/{size_id}", status_code=204)
def delete_size(size_id: str, conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM ref_sizes WHERE id = %s", (size_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Size not found")
