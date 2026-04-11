from uuid import UUID

import psycopg2
import psycopg2.extensions
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from api.auth import hash_password
from api.db import get_db

router = APIRouter()


class SetupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)


class SetupResponse(BaseModel):
    message: str
    user_id: UUID


@router.post("/setup", response_model=SetupResponse, status_code=status.HTTP_201_CREATED)
def setup(
    body: SetupRequest,
    conn: psycopg2.extensions.connection = Depends(get_db),
) -> SetupResponse:
    """One-time owner account creation. Can only succeed once."""
    cur = conn.cursor()
    try:
        # Check if setup has already been completed BEFORE validating input
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
                (str(body.email), hashed, body.first_name, body.last_name),
            )
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        row = cur.fetchone()
        user_id: UUID = row["id"]

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
