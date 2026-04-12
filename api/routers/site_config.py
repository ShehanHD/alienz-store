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
        cur.execute("SELECT key, value FROM site_config ORDER BY key")
        rows = cur.fetchall()
    return {row["key"]: row["value"] for row in rows}


@router.put("")
def update_settings(
    updates: dict[str, str],
    conn=Depends(get_db),
    _=Depends(require_owner),
):
    invalid = set(updates.keys()) - VALID_KEYS
    if invalid:
        raise HTTPException(status_code=422, detail=f"Unknown config keys: {sorted(invalid)}")

    with conn.cursor() as cur:
        for key, value in updates.items():
            cur.execute(
                "UPDATE site_config SET value = %s, updated_at = NOW() WHERE key = %s",
                (str(value), key),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=422, detail=f"Config key not found: {key}")
    return {"detail": "Config updated"}
