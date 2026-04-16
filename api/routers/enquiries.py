import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Literal, Optional

from api.auth import decode_access_token
from api.db import get_db
from api.dependencies import get_config, require_admin
from api.email import (
    send_enquiry_notification,
    send_enquiry_confirmation,
    send_enquiry_accepted,
    send_enquiry_rejected,
)

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
    quantity: int = Field(1, ge=1)


class EnquiryStatusIn(BaseModel):
    status: Literal["new", "read", "accepted", "rejected"]
    rejection_reason: Optional[str] = None


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
            INSERT INTO enquiries (user_id, product_id, name, email, phone, message, size, color, quantity)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, user_id, product_id, name, email, phone, message, size, color, quantity, status, created_at
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
                body.quantity,
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


_ALLOWED_ORDER_BY = frozenset({"created_at", "name", "status", "email"})


@router.get("/admin/enquiries")
def list_enquiries(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    order_by: str = Query("created_at"),
    order_dir: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    if order_by not in _ALLOWED_ORDER_BY:
        order_by = "created_at"
    if order_dir not in {"asc", "desc"}:
        order_dir = "desc"

    conditions: list[str] = []
    params: list = []

    if status:
        conditions.append("status = %s")
        params.append(status)

    if search:
        conditions.append(
            "(name ILIKE %s OR email ILIKE %s OR phone ILIKE %s OR message ILIKE %s)"
        )
        term = f"%{search}%"
        params.extend([term, term, term, term])

    where = (" WHERE " + " AND ".join(conditions)) if conditions else ""
    order = f" ORDER BY {order_by} {order_dir}"
    offset = (page - 1) * page_size

    with conn.cursor() as cur:
        cur.execute(
            f"SELECT * FROM enquiries{where}{order} LIMIT %s OFFSET %s",
            params + [page_size, offset],
        )
        items = [dict(r) for r in cur.fetchall()]
        cur.execute(f"SELECT COUNT(*) AS total FROM enquiries{where}", params)
        total = cur.fetchone()["total"]

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.put("/admin/enquiries/{enquiry_id}")
@router.patch("/admin/enquiries/{enquiry_id}")
def update_enquiry(
    enquiry_id: str,
    body: EnquiryStatusIn,
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    rejection_reason = body.rejection_reason if body.status == "rejected" else None
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE enquiries SET status = %s, rejection_reason = %s WHERE id = %s
            RETURNING id, user_id, product_id, name, email, phone, message,
                      size, color, quantity, status, rejection_reason, created_at
            """,
            (body.status, rejection_reason, enquiry_id),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    row = dict(row)
    row["id"] = str(row["id"])
    row["user_id"] = str(row["user_id"]) if row["user_id"] else None
    row["product_id"] = str(row["product_id"]) if row["product_id"] else None
    row["created_at"] = row["created_at"].isoformat()

    if body.status in ("accepted", "rejected"):
        product: Optional[dict] = None
        if row["product_id"]:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT p.name, p.price,
                           (SELECT pi.url FROM product_images pi
                            WHERE pi.product_id = p.id
                            ORDER BY pi.sort_order ASC
                            LIMIT 1) AS thumbnail_url
                    FROM products p
                    WHERE p.id = %s
                    """,
                    (row["product_id"],),
                )
                product_row = cur.fetchone()
                if product_row:
                    product = dict(product_row)

        if body.status == "accepted":
            try:
                send_enquiry_accepted(row, product)
            except Exception:
                logger.error("Failed to send acceptance email for enquiry %s", row["id"], exc_info=True)
        else:
            try:
                send_enquiry_rejected(row)
            except Exception:
                logger.error("Failed to send rejection email for enquiry %s", row["id"], exc_info=True)

    return row
