import secrets
from typing import Optional

import psycopg2.errors
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from pydantic import BaseModel, EmailStr, Field

from api.auth import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from api.config import settings
from api.db import get_db
from api.dependencies import get_config, get_current_user
from api.email import send_email_confirmation

router = APIRouter(prefix="/auth", tags=["auth"])

_REFRESH_COOKIE = "refresh_token"
_COOKIE_MAX_AGE = 7 * 24 * 60 * 60


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=1, max_length=30)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ResendConfirmationIn(BaseModel):
    email: EmailStr


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        max_age=_COOKIE_MAX_AGE,
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterIn,
    conn=Depends(get_db),
) -> dict:
    if get_config("allow_registrations", conn) != "true":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Registrations are currently disabled")

    hashed = hash_password(body.password)
    token = secrets.token_hex(32)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (email, hashed_password, role, first_name, last_name, phone, is_active)
                VALUES (%s, %s, 'client', %s, %s, %s, FALSE)
                RETURNING id, email
                """,
                (str(body.email), hashed, body.first_name, body.last_name, body.phone),
            )
            user = dict(cur.fetchone())
            cur.execute(
                "INSERT INTO email_confirmations (user_id, token) VALUES (%s, %s)",
                (str(user["id"]), token),
            )
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    send_email_confirmation(str(body.email), token)

    return {"detail": "Check your email to confirm your account"}


@router.get("/confirm-email")
def confirm_email(token: str, conn=Depends(get_db)) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE email_confirmations
            SET used_at = NOW()
            WHERE token = %s AND used_at IS NULL AND expires_at > NOW()
            RETURNING user_id
            """,
            (token,),
        )
        updated = cur.fetchone()

    if not updated:
        # Determine why the update matched nothing
        with conn.cursor() as cur:
            cur.execute(
                "SELECT used_at, expires_at FROM email_confirmations WHERE token = %s",
                (token,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid confirmation link")
        if row["used_at"] is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Confirmation link already used")
        raise HTTPException(status_code=410, detail="Confirmation link has expired")

    with conn.cursor() as cur:
        cur.execute("UPDATE users SET is_active = TRUE WHERE id = %s", (str(updated["user_id"]),))

    return {"detail": "Email confirmed. You can now log in."}


@router.post("/resend-confirmation")
def resend_confirmation(body: ResendConfirmationIn, conn=Depends(get_db)) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM users WHERE email = %s AND is_active = FALSE",
            (str(body.email),),
        )
        user = cur.fetchone()

    if user:
        user_id = str(user["id"])
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE email_confirmations SET used_at = NOW() "
                "WHERE user_id = %s AND used_at IS NULL",
                (user_id,),
            )
        token = secrets.token_hex(32)
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO email_confirmations (user_id, token) VALUES (%s, %s)",
                (user_id, token),
            )
        send_email_confirmation(str(body.email), token)

    return {"detail": "If that account exists and is unconfirmed, a new link has been sent."}


@router.post("/login")
def login(body: LoginIn, response: Response, conn=Depends(get_db)) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, email, hashed_password, role, first_name, last_name, is_active, created_at FROM users WHERE email = %s",
            (str(body.email),),
        )
        user = cur.fetchone()

    if not user or not user["is_active"] or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access = create_access_token(str(user["id"]), user["role"])
    refresh = create_refresh_token(str(user["id"]))
    _set_refresh_cookie(response, refresh)

    return {
        "access_token": access,
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "role": user["role"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "is_active": user["is_active"],
            "created_at": user["created_at"].isoformat(),
        },
    }


@router.get("/me")
def me(conn=Depends(get_db), current_user: dict = Depends(get_current_user)) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, email, role, first_name, last_name, phone, is_active, created_at FROM users WHERE id = %s",
            (current_user["id"],),
        )
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {
        "id": str(user["id"]),
        "email": user["email"],
        "role": user["role"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "phone": user["phone"] or "",
        "is_active": user["is_active"],
        "created_at": user["created_at"].isoformat(),
    }


@router.post("/logout")
def logout(
    response: Response,
    _: dict = Depends(get_current_user),
) -> dict:
    response.delete_cookie(_REFRESH_COOKIE)
    return {"detail": "Logged out"}


@router.post("/refresh")
def refresh(
    response: Response,
    conn=Depends(get_db),
    refresh_token: Optional[str] = Cookie(default=None),
) -> dict:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    user_id = decode_refresh_token(refresh_token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    with conn.cursor() as cur:
        cur.execute("SELECT id, role, is_active FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()

    if not user or not user["is_active"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    access = create_access_token(str(user["id"]), user["role"])
    new_refresh = create_refresh_token(str(user["id"]))
    _set_refresh_cookie(response, new_refresh)

    return {"access_token": access}
