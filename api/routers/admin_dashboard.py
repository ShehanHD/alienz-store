from fastapi import APIRouter, Depends, HTTPException, status

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
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail="site_config key 'max_products' is missing")
        max_products = int(row["value"])

        cur.execute("SELECT value FROM site_config WHERE key = 'storage_quota_mb'")
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail="site_config key 'storage_quota_mb' is missing")
        storage_quota_mb = int(row["value"])

        # Enquiry counts grouped by status (missing statuses default to 0).
        cur.execute("SELECT status, COUNT(*) AS cnt FROM enquiries GROUP BY status")
        status_counts = {r["status"]: r["cnt"] for r in cur.fetchall()}
        by_status = {
            "new": status_counts.get("new", 0),
            "read": status_counts.get("read", 0),
            "accepted": status_counts.get("accepted", 0),
            "rejected": status_counts.get("rejected", 0),
        }

        # Enquiry volume for the last 14 days, zero-filled for days with none.
        cur.execute(
            """
            SELECT to_char(d.day, 'YYYY-MM-DD') AS date, COALESCE(c.cnt, 0) AS count
            FROM generate_series(
                CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day'
            ) AS d(day)
            LEFT JOIN (
                SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS cnt
                FROM enquiries
                WHERE created_at >= CURRENT_DATE - INTERVAL '13 days'
                GROUP BY 1
            ) AS c ON c.day = d.day::date
            ORDER BY d.day
            """
        )
        last_14_days = [{"date": r["date"], "count": r["count"]} for r in cur.fetchall()]

        # New client signups: last 30 days vs the preceding 30 days (for trend).
        cur.execute(
            """
            SELECT
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_30d,
                COUNT(*) FILTER (
                    WHERE created_at >= NOW() - INTERVAL '60 days'
                      AND created_at <  NOW() - INTERVAL '30 days'
                ) AS prev_30d
            FROM users
            WHERE role = 'client'
            """
        )
        row = cur.fetchone()
        new_clients_30d = row["new_30d"]
        prev_clients_30d = row["prev_30d"]

    return {
        "products": {"total": total_products, "active": active_products, "max": max_products},
        "enquiries": {
            "total": total_enquiries,
            "new": new_enquiries,
            "by_status": by_status,
            "last_14_days": last_14_days,
        },
        "clients": {
            "total": total_clients,
            "new_30d": new_clients_30d,
            "prev_30d": prev_clients_30d,
        },
        "storage": {"quota_mb": storage_quota_mb},
    }
