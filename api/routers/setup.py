from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import psycopg2

from api.auth import hash_password
from api.db import get_db

router = APIRouter()


class SetupRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str


class SetupResponse(BaseModel):
    message: str
    user_id: str


def _validate_email(email: str) -> None:
    """Basic email validation — must be non-empty and contain '@'."""
    if not email or "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid email address",
        )


def _validate_password(password: str) -> None:
    """Password must be at least 8 characters."""
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters",
        )


@router.post("/setup", response_model=SetupResponse, status_code=status.HTTP_201_CREATED)
def setup(body: SetupRequest, conn=Depends(get_db)) -> SetupResponse:
    """One-time owner account creation. Can only succeed once."""
    _validate_email(body.email)
    _validate_password(body.password)

    cur = conn.cursor()
    try:
        # Check if setup has already been completed
        cur.execute(
            "SELECT value FROM setup_flags WHERE key = 'setup_complete'"
        )
        row = cur.fetchone()
        if row and row["value"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Setup already completed",
            )

        # Hash password and insert owner user + mark setup complete atomically
        hashed = hash_password(body.password)
        try:
            cur.execute(
                """
                INSERT INTO users (email, hashed_password, role, first_name, last_name)
                VALUES (%s, %s, 'owner', %s, %s)
                RETURNING id
                """,
                (body.email, hashed, body.first_name, body.last_name),
            )
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        row = cur.fetchone()
        user_id = str(row["id"])

        cur.execute(
            """
            INSERT INTO setup_flags (key, value) VALUES ('setup_complete', TRUE)
            ON CONFLICT (key) DO UPDATE SET value = TRUE
            """
        )

        # conn is committed by get_db on success (no explicit commit needed)
        return SetupResponse(message="Setup complete", user_id=user_id)
    finally:
        cur.close()
