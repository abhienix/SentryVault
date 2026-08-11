import os
from typing import List, Union, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "SentryVault Bank"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security & Auth
    SECRET_KEY: str = Field(default="super-secret-production-key-securebank-2026-change-in-prod-123456789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # Database Options for Standalone/Remote VM Deployment
    DB_HOST: Optional[str] = Field(default=None)
    DB_PORT: Optional[str] = Field(default="3306")
    DB_USER: Optional[str] = Field(default=None)
    DB_PASSWORD: Optional[str] = Field(default=None)
    DB_NAME: Optional[str] = Field(default="sentryvault")
    DATABASE_URL: str = Field(default="sqlite:///./securebank.db")

    @validator("DATABASE_URL", pre=True, always=True)
    def assemble_db_connection(cls, v: str, values: dict) -> str:
        db_host = values.get("DB_HOST")
        db_user = values.get("DB_USER")
        db_password = values.get("DB_PASSWORD")
        db_port = values.get("DB_PORT") or "3306"
        db_name = values.get("DB_NAME") or "sentryvault"

        if db_host and db_user and db_password:
            # Construct MySQL driver URL for external VM
            return f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        return v
    
    # Demo Mode Flag (Sentry Vulnerability Showcase)
    DEMO_MODE: bool = Field(default=True)
    
    # Logging
    LOG_FILE_PATH: str = Field(default="/app/logs/application.log")
    LOG_LEVEL: str = Field(default="INFO")
    
    # CORS
    BACKEND_CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:80", "http://localhost"]
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
