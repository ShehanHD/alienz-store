from fastapi import APIRouter, Depends, HTTPException

from api.db import get_db
from api.dependencies import require_owner

router = APIRouter(prefix="/admin/settings", tags=["site_config"])

VALID_KEYS = {
    "max_products", "max_images_per_product", "storage_quota_mb",
    "max_upload_size_mb", "image_output_max_width", "enquiry_email",
    "maintenance_mode", "max_wishlist_items", "allow_registrations",
}


@router.get("")
def get_settings(conn=Depends(get_db), _=Depends(require_owner)):
    with conn.cursor() as cur:
        cur.execute("SELECT key, value, updated_at FROM site_config ORDER BY key")
        rows = cur.fetchall()
    return [
        {"key": row["key"], "value": row["value"], "updated_at": row["updated_at"].isoformat()}
        for row in rows
    ]


@router.put("/{key}")
def update_setting(
    key: str,
    body: dict,
    conn=Depends(get_db),
    _=Depends(require_owner),
):
    if key not in VALID_KEYS:
        raise HTTPException(status_code=422, detail=f"Unknown config key: {key}")

    value = body.get("value")
    if value is None:
        raise HTTPException(status_code=422, detail="Missing field: value")

    with conn.cursor() as cur:
        cur.execute(
            "UPDATE site_config SET value = %s, updated_at = NOW() WHERE key = %s "
            "RETURNING key, value, updated_at",
            (str(value), key),
        )
        row = cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail=f"Config key not found: {key}")

    return {"key": row["key"], "value": row["value"], "updated_at": row["updated_at"].isoformat()}
