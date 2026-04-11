import psycopg2.errors
from fastapi import APIRouter, Depends, HTTPException

from api.db import get_db
from api.dependencies import get_current_user, get_config

router = APIRouter(prefix="/account/wishlist", tags=["wishlist"])


@router.get("")
def list_wishlist(conn=Depends(get_db), current_user: dict = Depends(get_current_user)):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT w.id, w.product_id, p.name, p.slug, p.price,
                   pi.thumbnail_url AS primary_thumbnail
            FROM wishlist_items w
            JOIN products p ON p.id = w.product_id
            LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
            WHERE w.user_id = %s
            ORDER BY w.created_at DESC
            """,
            (current_user["id"],),
        )
        return [dict(r) for r in cur.fetchall()]


@router.post("/{product_id}", status_code=201)
def add_to_wishlist(
    product_id: str,
    conn=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    max_items = int(get_config("max_wishlist_items", conn))
    with conn.cursor() as cur:
        # Advisory lock serialises concurrent adds for the same user, preventing TOCTOU on the cap check.
        cur.execute("SELECT pg_advisory_xact_lock(%s)", (current_user["id"],))
        cur.execute(
            "SELECT COUNT(*) AS cnt FROM wishlist_items WHERE user_id = %s",
            (current_user["id"],),
        )
        if cur.fetchone()["cnt"] >= max_items:
            raise HTTPException(status_code=422, detail=f"Wishlist limit of {max_items} reached")
        try:
            cur.execute(
                "INSERT INTO wishlist_items (user_id, product_id) VALUES (%s, %s) RETURNING id, product_id",
                (current_user["id"], product_id),
            )
            return dict(cur.fetchone())
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            raise HTTPException(status_code=409, detail="Item already in wishlist")


@router.delete("/{product_id}", status_code=204)
def remove_from_wishlist(
    product_id: str,
    conn=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM wishlist_items WHERE user_id = %s AND product_id = %s",
            (current_user["id"], product_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item not in wishlist")
