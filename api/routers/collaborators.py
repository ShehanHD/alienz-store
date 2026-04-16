import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional
from api.db import get_db
from api.dependencies import require_admin, get_config
from api.image_processor import process_image
from api.storage import upload_file, delete_files
from api.config import settings

_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_MB = 1024 * 1024
_MAX_SIZE_MB = 10

router = APIRouter(tags=["collaborators"])


class CollaboratorIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    instagram_url: str = Field(..., min_length=1)
    image_url: Optional[str] = None
    is_featured: bool = False
    display_order: int = 0
    collab_type: str = Field('person', pattern=r'^(person|logo)$')


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
            "SELECT id, name, instagram_url, image_url, is_featured, display_order, collab_type, created_at "
            "FROM collaborators ORDER BY display_order, name"
        )
        return [_row(r) for r in cur.fetchall()]


@router.post("/collaborators", status_code=201, dependencies=[Depends(require_admin)])
def create_collaborator(body: CollaboratorIn, conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO collaborators (name, instagram_url, image_url, is_featured, display_order, collab_type) "
            "VALUES (%s, %s, %s, %s, %s, %s) "
            "RETURNING id, name, instagram_url, image_url, is_featured, display_order, collab_type, created_at",
            (body.name, body.instagram_url, body.image_url, body.is_featured, body.display_order, body.collab_type),
        )
        return _row(cur.fetchone())


@router.patch("/collaborators/reorder", status_code=204, dependencies=[Depends(require_admin)])
def reorder_collaborators(items: list[ReorderItem], conn=Depends(get_db)):
    with conn.cursor() as cur:
        for item in items:
            cur.execute(
                "UPDATE collaborators SET display_order=%s WHERE id=%s",
                (item.display_order, item.id),
            )


@router.put("/collaborators/{collaborator_id}", status_code=200, dependencies=[Depends(require_admin)])
def update_collaborator(collaborator_id: str, body: CollaboratorIn, conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE collaborators SET name=%s, instagram_url=%s, image_url=%s, is_featured=%s, display_order=%s, collab_type=%s "
            "WHERE id=%s "
            "RETURNING id, name, instagram_url, image_url, is_featured, display_order, collab_type, created_at",
            (body.name, body.instagram_url, body.image_url, body.is_featured, body.display_order, body.collab_type, collaborator_id),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Collaborator not found")
    return _row(row)


def _delete_storage_url(url: str | None) -> None:
    if not url:
        return
    prefix = f"/storage/v1/object/public/{settings.supabase_storage_bucket}/"
    if prefix in url:
        try:
            delete_files([url.split(prefix, 1)[1]])
        except Exception:
            pass


@router.delete("/collaborators/{collaborator_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_collaborator(collaborator_id: str, conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute("SELECT image_url FROM collaborators WHERE id = %s", (collaborator_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Collaborator not found")
        cur.execute("DELETE FROM collaborators WHERE id = %s", (collaborator_id,))
    _delete_storage_url(row["image_url"])


@router.post("/admin/collaborators/upload-image", dependencies=[Depends(require_admin)])
def upload_collaborator_image(file: UploadFile = File(...), conn=Depends(get_db)):
    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(status_code=422, detail="Unsupported format. Allowed: jpeg, png, webp, gif")

    try:
        data = file.file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read uploaded file")

    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(data) > _MAX_SIZE_MB * _MB:
        raise HTTPException(status_code=413, detail=f"File exceeds {_MAX_SIZE_MB}MB limit")

    max_width = int(get_config("image_output_max_width", conn))
    try:
        full_bytes, _ = process_image(data, max_width=max_width)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Image processing failed: {e}")

    storage_path = f"collaborators/{uuid.uuid4()}.webp"
    try:
        url = upload_file(storage_path, full_bytes)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Storage upload failed: {e}")

    return {"url": url}
