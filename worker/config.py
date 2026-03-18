"""
FrameAgent Worker — Configuração
"""
from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    # Supabase
    supabase_url:         str = "https://duogqvusxueetapcvsfp.supabase.co"
    supabase_service_key: str = ""

    # Upstash Redis (REST API)
    upstash_redis_url:   str = ""
    upstash_redis_token: str = ""

    # Vault — mesma VAULT_KEY do Next.js (AES-256-GCM)
    vault_key: str = ""

    # Worker
    worker_secret:   str = "frameagent-worker-secret"  # header X-Worker-Secret
    poll_interval_s: int = 2   # segundos entre polls da fila
    job_timeout_s:   int = 120 # timeout por job

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
