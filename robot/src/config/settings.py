"""Application settings."""
from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # MT5 Settings
    mt5_login: int = Field(default=0, description="MT5 login ID")
    mt5_password: str = Field(default="", description="MT5 password")
    mt5_server: str = Field(default="", description="MT5 server")
    mt5_path: str = Field(default="", description="MT5 terminal path")

    # Database
    database_url: str = Field(
        default="postgresql://user:pass@localhost:5432/forexos",
        description="PostgreSQL database URL",
    )

    # Redis
    redis_url: str = Field(
        default="redis://localhost:6379",
        description="Redis URL for caching and pub/sub",
    )

    # API
    api_url: str = Field(
        default="http://localhost:3001",
        description="ForexOS API URL",
    )
    api_key: str = Field(default="", description="API key for authentication")

    # Logging
    log_level: str = Field(default="INFO", description="Logging level")

    # Risk Settings
    max_risk_percent: float = Field(default=1.0, description="Max risk per trade %")
    max_positions: int = Field(default=5, description="Maximum open positions")


settings = Settings()
