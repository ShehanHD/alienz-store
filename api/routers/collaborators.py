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


@router.post("/collaborators", status_code=201, dependencies=[Depends(require_admin)])
def create_collaborator(body: CollaboratorIn, conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO collaborators (name, instagram_url, image_url, is_featured, display_order) "
            "VALUES (%s, %s, %s, %s, %s) "
            "RETURNING id, name, instagram_url, image_url, is_featured, display_order, created_at",
            (body.name, body.instagram_url, body.image_url, body.is_featured, body.display_order),
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
            "UPDATE collaborators SET name=%s, instagram_url=%s, image_url=%s, is_featured=%s, display_order=%s "
            "WHERE id=%s "
            "RETURNING id, name, instagram_url, image_url, is_featured, display_order, created_at",
            (body.name, body.instagram_url, body.image_url, body.is_featured, body.display_order, collaborator_id),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Collaborator not found")
    return _row(row)


@router.delete("/collaborators/{collaborator_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_collaborator(collaborator_id: str, conn=Depends(get_db)):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM collaborators WHERE id = %s", (collaborator_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Collaborator not found")
