import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Literal, Optional

from api.auth import decode_access_token
from api.db import get_db
from api.dependencies import get_config, require_admin
from api.email import send_enquiry_notification, send_enquiry_confirmation

router = APIRouter(tags=["enquiries"])
security = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


class EnquiryIn(BaseModel):
    name: str
    email: EmailStr
    phone: str = ""
    message: str = ""
    product_id: Optional[str] = None
    size: str = ""
    color: str = ""


class EnquiryStatusIn(BaseModel):
    status: Literal["new", "read", "replied"]


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
            INSERT INTO enquiries (user_id, product_id, name, email, phone, message, size, color)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, user_id, product_id, name, email, phone, message, size, color, status, created_at
            """,
            (
                str(current_user["id"]) if current_user else None,
                body.product_id,
                body.name,
                str(body.email),
                body.phone,
                body.message,
                body.size,
                body.color,
            ),
        )
        row = dict(cur.fetchone())

    row["id"] = str(row["id"])
    row["user_id"] = str(row["user_id"]) if row["user_id"] else None

    # Resolve product name if this is a product enquiry
    product_name: Optional[str] = None
    if body.product_id:
        with conn.cursor() as cur:
            cur.execute("SELECT name FROM products WHERE id = %s", (body.product_id,))
            product_row = cur.fetchone()
            if product_row:
                product_name = product_row["name"]

    # Send emails — failures are logged and swallowed so the enquiry is never lost
    try:
        admin_email = get_config("enquiry_email", conn)
    except RuntimeError:
        logger.warning("enquiry_email not configured; skipping admin notification")
        admin_email = None
    if admin_email:
        try:
            send_enquiry_notification(row, admin_email, product_name)
        except Exception:
            logger.error("Failed to send enquiry notification for enquiry %s", row["id"], exc_info=True)
    try:
        send_enquiry_confirmation(row, product_name)
    except Exception:
        logger.error("Failed to send enquiry confirmation for enquiry %s", row["id"], exc_info=True)

    return row


@router.get("/admin/enquiries")
def list_enquiries(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    base_query = "SELECT * FROM enquiries"
    count_query = "SELECT COUNT(*) AS total FROM enquiries"
    params: list = []
    if status:
        condition = " WHERE status = %s"
        params.append(status)
    else:
        condition = ""

    offset = (page - 1) * page_size
    with conn.cursor() as cur:
        cur.execute(
            base_query + condition + " ORDER BY created_at DESC LIMIT %s OFFSET %s",
            params + [page_size, offset],
        )
        items = [dict(r) for r in cur.fetchall()]
        cur.execute(count_query + condition, params)
        total = cur.fetchone()["total"]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.put("/admin/enquiries/{enquiry_id}")
def update_enquiry(
    enquiry_id: str,
    body: EnquiryStatusIn,
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE enquiries SET status = %s WHERE id = %s RETURNING id, status",
            (body.status, enquiry_id),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return dict(row)
