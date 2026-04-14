from fastapi import APIRouter, Depends, HTTPException, Query

from api.db import get_db
from api.dependencies import require_admin, require_owner

router = APIRouter(prefix="/admin/clients", tags=["admin_clients"])


@router.get("")
def list_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    offset = (page - 1) * page_size
    with conn.cursor() as cur:
        if search:
            pattern = f"%{search}%"
            cur.execute(
                "SELECT id, email, role, first_name, last_name, is_active, created_at "
                "FROM users WHERE role != 'owner' "
                "AND (first_name ILIKE %s OR last_name ILIKE %s OR email ILIKE %s) "
                "ORDER BY created_at DESC LIMIT %s OFFSET %s",
                (pattern, pattern, pattern, page_size, offset),
            )
            items = [dict(r) for r in cur.fetchall()]
            cur.execute(
                "SELECT COUNT(*) AS total FROM users WHERE role != 'owner' "
                "AND (first_name ILIKE %s OR last_name ILIKE %s OR email ILIKE %s)",
                (pattern, pattern, pattern),
            )
        else:
            cur.execute(
                "SELECT id, email, role, first_name, last_name, is_active, created_at "
                "FROM users WHERE role != 'owner' ORDER BY created_at DESC LIMIT %s OFFSET %s",
                (page_size, offset),
            )
            items = [dict(r) for r in cur.fetchall()]
            cur.execute("SELECT COUNT(*) AS total FROM users WHERE role != 'owner'")
        total = cur.fetchone()["total"]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.put("/{user_id}/disable")
def disable_client(user_id: str, conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE users SET is_active = FALSE WHERE id = %s AND role != 'owner' "
            "RETURNING id, email, is_active",
            (user_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found or cannot be disabled")
    return dict(row)


@router.put("/{user_id}/enable")
def enable_client(user_id: str, conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE users SET is_active = TRUE WHERE id = %s AND role != 'owner' "
            "RETURNING id, email, is_active",
            (user_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)


@router.post("/{user_id}/promote")
def promote_to_admin(user_id: str, conn=Depends(get_db), _=Depends(require_owner)):
    with conn.cursor() as cur:
        cur.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        if row["role"] == "owner":
            raise HTTPException(status_code=422, detail="Cannot change the owner role")
        cur.execute(
            "UPDATE users SET role = 'admin' WHERE id = %s RETURNING id, email, role",
            (user_id,),
        )
        return dict(cur.fetchone())


@router.delete("/{user_id}", status_code=204)
def delete_client(user_id: str, conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        cur.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        if row["role"] == "owner":
            raise HTTPException(status_code=422, detail="Cannot delete the owner account")
        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
