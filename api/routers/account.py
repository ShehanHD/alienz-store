from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from api.auth import hash_password, verify_password
from api.db import get_db
from api.dependencies import get_current_user

router = APIRouter(prefix="/account", tags=["account"])


class ProfileIn(BaseModel):
    first_name: str
    last_name: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


class AddressIn(BaseModel):
    street: str
    city: str
    country: str
    postal_code: str


@router.get("/profile")
def get_profile(
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = %s",
            (current_user["id"],),
        )
        user = cur.fetchone()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return dict(user)


@router.put("/profile")
def update_profile(
    body: ProfileIn,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE users
            SET first_name = %s, last_name = %s
            WHERE id = %s
            RETURNING id, email, first_name, last_name, role, created_at
            """,
            (body.first_name, body.last_name, current_user["id"]),
        )
        user = cur.fetchone()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return dict(user)


@router.post("/change-password")
def change_password(
    body: ChangePasswordIn,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT hashed_password FROM users WHERE id = %s",
            (current_user["id"],),
        )
        row = cur.fetchone()

    if not row or not verify_password(body.current_password, row["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")

    new_hashed = hash_password(body.new_password)
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE users SET hashed_password = %s WHERE id = %s",
            (new_hashed, current_user["id"]),
        )

    return {"detail": "Password updated"}


@router.get("/address")
def get_address(
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, street, city, country, postal_code, is_default FROM addresses WHERE user_id = %s AND is_default = TRUE",
            (current_user["id"],),
        )
        row = cur.fetchone()
    if row is None:
        return None
    return dict(row)


@router.put("/address")
def save_address(
    body: AddressIn,
    current_user: dict = Depends(get_current_user),
    conn=Depends(get_db),
) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM addresses WHERE user_id = %s AND is_default = TRUE",
            (current_user["id"],),
        )
        existing = cur.fetchone()

        if existing:
            cur.execute(
                """
                UPDATE addresses
                SET street = %s, city = %s, country = %s, postal_code = %s
                WHERE id = %s
                RETURNING id, street, city, country, postal_code, is_default
                """,
                (body.street, body.city, body.country, body.postal_code, existing["id"]),
            )
        else:
            cur.execute(
                """
                INSERT INTO addresses (user_id, street, city, country, postal_code, is_default)
                VALUES (%s, %s, %s, %s, %s, TRUE)
                RETURNING id, street, city, country, postal_code, is_default
                """,
                (current_user["id"], body.street, body.city, body.country, body.postal_code),
            )

        row = cur.fetchone()
    return dict(row)
