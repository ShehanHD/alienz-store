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
from api.db import get_db
from api.dependencies import get_config, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

_REFRESH_COOKIE = "refresh_token"
_COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days in seconds


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=_COOKIE_MAX_AGE,
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterIn,
    response: Response,
    conn=Depends(get_db),
) -> dict:
    if get_config("allow_registrations", conn) != "true":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Registrations are currently disabled")

    hashed = hash_password(body.password)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (email, hashed_password, role, first_name, last_name)
                VALUES (%s, %s, 'client', %s, %s)
                RETURNING id, email, role
                """,
                (str(body.email), hashed, body.first_name, body.last_name),
            )
            user = dict(cur.fetchone())
    except psycopg2.errors.UniqueViolation:
        conn.rollback()  # must clear aborted txn before raising HTTPException
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    access = create_access_token(str(user["id"]), user["role"])
    refresh = create_refresh_token(str(user["id"]))
    _set_refresh_cookie(response, refresh)

    return {
        "user_id": str(user["id"]),
        "email": user["email"],
        "role": user["role"],
        "access_token": access,
    }


@router.post("/login")
def login(body: LoginIn, response: Response, conn=Depends(get_db)) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, hashed_password, role, is_active FROM users WHERE email = %s",
            (str(body.email),),
        )
        user = cur.fetchone()

    if not user or not user["is_active"] or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access = create_access_token(str(user["id"]), user["role"])
    refresh = create_refresh_token(str(user["id"]))
    _set_refresh_cookie(response, refresh)

    return {"access_token": access}


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
