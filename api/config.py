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
    environment: str = "development"
    frontend_url: str = "http://localhost:5173"
    site_url: str = "http://localhost:5173"
    smtp_host: str = ""
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""
    from_email: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
