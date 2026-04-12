from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    admin_email: str = ""
    admin_password: str = ""
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_storage_bucket: str = "product-images"

    model_config = {"env_file": ".env"}


settings = Settings()
