import pytest

from api.auth import (
    hash_password, verify_password,
    create_access_token, decode_access_token,
    create_refresh_token, decode_refresh_token,
)

pytestmark = pytest.mark.no_db


def test_password_hash_and_verify():
    hashed = hash_password("mysecret")
    assert verify_password("mysecret", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_access_token_roundtrip():
    token = create_access_token(user_id="abc123", role="client")
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "abc123"
    assert payload["role"] == "client"


def test_refresh_token_not_accepted_as_access():
    token = create_refresh_token(user_id="abc123")
    assert decode_access_token(token) is None  # must be rejected


def test_refresh_token_roundtrip():
    token = create_refresh_token(user_id="abc123")
    user_id = decode_refresh_token(token)
    assert user_id == "abc123"


def test_access_token_not_accepted_as_refresh():
    token = create_access_token(user_id="abc123", role="admin")
    assert decode_refresh_token(token) is None
