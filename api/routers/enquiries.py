from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional

from api.auth import decode_access_token
from api.db import get_db
from api.dependencies import require_admin

router = APIRouter(tags=["enquiries"])

security = HTTPBearer(auto_error=False)


class EnquiryIn(BaseModel):
    name: str
    email: EmailStr
    message: str
    product_id: Optional[str] = None


class EnquiryStatusIn(BaseModel):
    status: str  # 'new' | 'read' | 'replied'


def _optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    conn=Depends(get_db),
) -> Optional[dict]:
    """Returns the current user if a valid token is present, else None."""
    if not credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return None
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE id = %s AND is_active = TRUE", (payload["sub"],))
        row = cur.fetchone()
    return dict(row) if row else None


@router.post("/enquiries", status_code=201)
def submit_enquiry(
    body: EnquiryIn,
    conn=Depends(get_db),
    current_user: Optional[dict] = Depends(_optional_user),
):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO enquiries (user_id, product_id, name, email, message)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, user_id, product_id, name, email, message, status, created_at
            """,
            (
                str(current_user["id"]) if current_user else None,
                body.product_id,
                body.name,
                str(body.email),
                body.message,
            ),
        )
        row = dict(cur.fetchone())
    row["id"] = str(row["id"])
    row["user_id"] = str(row["user_id"]) if row["user_id"] else None
    return row


@router.get("/admin/enquiries")
def list_enquiries(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    where = ""
    params: list = []
    if status:
        where = "WHERE status = %s"
        params.append(status)

    offset = (page - 1) * page_size
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT * FROM enquiries {where} ORDER BY created_at DESC LIMIT %s OFFSET %s",
            params + [page_size, offset],
        )
        items = [dict(r) for r in cur.fetchall()]
        cur.execute(f"SELECT COUNT(*) AS total FROM enquiries {where}", params)
        total = cur.fetchone()["total"]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.put("/admin/enquiries/{enquiry_id}")
def update_enquiry(
    enquiry_id: str,
    body: EnquiryStatusIn,
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    if body.status not in ("new", "read", "replied"):
        raise HTTPException(status_code=422, detail="Invalid status")
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE enquiries SET status = %s WHERE id = %s RETURNING id, status",
            (body.status, enquiry_id),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return dict(row)
