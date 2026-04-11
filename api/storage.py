from supabase import create_client, Client
from .config import settings

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _client


def upload_file(storage_path: str, data: bytes, content_type: str = "image/webp") -> str:
    """Upload bytes to Supabase Storage. Returns the public URL."""
    client = _get_client()
    client.storage.from_(settings.supabase_storage_bucket).upload(
        storage_path,
        data,
        {"content-type": content_type, "cache-control": "3600"},
    )
    return client.storage.from_(settings.supabase_storage_bucket).get_public_url(storage_path)


def delete_files(paths: list[str]) -> None:
    """Delete one or more files from Supabase Storage."""
    if not paths:
        return
    client = _get_client()
    client.storage.from_(settings.supabase_storage_bucket).remove(paths)
