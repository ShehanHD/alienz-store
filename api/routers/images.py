import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from api.db import get_db
from api.dependencies import require_admin, get_config
from api.image_processor import process_image
from api.storage import upload_file, delete_files

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

    if file.content_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
        raise HTTPException(status_code=422, detail="Unsupported image format")

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM products WHERE id = %s", (product_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Product not found")

        cur.execute("SELECT COUNT(*) AS cnt FROM product_images WHERE product_id = %s", (product_id,))
        if cur.fetchone()["cnt"] >= max_images:
            raise HTTPException(status_code=422, detail=f"Max {max_images} images per product")

    data = file.file.read()
    if len(data) > max_upload_mb * MB:
        raise HTTPException(status_code=413, detail=f"File exceeds {max_upload_mb}MB limit")

    full_bytes, thumb_bytes = process_image(data, max_width=max_width)

    image_id = str(uuid.uuid4())
    storage_path = f"products/{product_id}/{image_id}.webp"
    thumb_path = f"products/{product_id}/{image_id}_thumb.webp"

    url = upload_file(storage_path, full_bytes)
    thumbnail_url = upload_file(thumb_path, thumb_bytes)

    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS cnt FROM product_images WHERE product_id = %s", (product_id,))
        is_primary = cur.fetchone()["cnt"] == 0
        cur.execute(
            """
            INSERT INTO product_images (product_id, url, thumbnail_url, storage_path, thumb_path, is_primary, sort_order)
            VALUES (%s, %s, %s, %s, %s, %s,
                    (SELECT COALESCE(MAX(sort_order)+1, 0) FROM product_images WHERE product_id = %s))
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
    with conn.cursor() as cur:
        cur.execute(
            "SELECT storage_path, thumb_path, is_primary FROM product_images WHERE id = %s AND product_id = %s",
            (image_id, product_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Image not found")

        delete_files([row["storage_path"], row["thumb_path"]])
        cur.execute("DELETE FROM product_images WHERE id = %s", (image_id,))

        if row["is_primary"]:
            cur.execute(
                """
                UPDATE product_images SET is_primary = TRUE
                WHERE id = (
                    SELECT id FROM product_images
                    WHERE product_id = %s
                    ORDER BY sort_order
                    LIMIT 1
                )
                """,
                (product_id,),
            )


@router.put("/admin/products/{product_id}/images/{image_id}/primary", status_code=200)
def set_primary_image(
    product_id: str,
    image_id: str,
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    with conn.cursor() as cur:
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
