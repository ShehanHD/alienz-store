from fastapi import APIRouter, Depends

from api.db import get_db
from api.dependencies import require_admin

router = APIRouter(prefix="/admin/dashboard", tags=["admin_dashboard"])


@router.get("")
def get_stats(conn=Depends(get_db), _=Depends(require_admin)):
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS total FROM products")
        total_products = cur.fetchone()["total"]

        cur.execute("SELECT COUNT(*) AS total FROM products WHERE is_active = TRUE")
        active_products = cur.fetchone()["total"]

        cur.execute("SELECT COUNT(*) AS total FROM enquiries")
        total_enquiries = cur.fetchone()["total"]

        cur.execute("SELECT COUNT(*) AS total FROM enquiries WHERE status = 'new'")
        new_enquiries = cur.fetchone()["total"]

        cur.execute("SELECT COUNT(*) AS total FROM users WHERE role = 'client'")
        total_clients = cur.fetchone()["total"]

        cur.execute("SELECT value FROM site_config WHERE key = 'max_products'")
        max_products = int(cur.fetchone()["value"])

        cur.execute("SELECT value FROM site_config WHERE key = 'storage_quota_mb'")
        storage_quota_mb = int(cur.fetchone()["value"])

    return {
        "products": {"total": total_products, "active": active_products, "max": max_products},
        "enquiries": {"total": total_enquiries, "new": new_enquiries},
        "clients": {"total": total_clients},
        "storage": {"quota_mb": storage_quota_mb},
    }
