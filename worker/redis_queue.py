"""
FrameAgent Worker — Upstash Redis Queue (REST API)
Compatível com a lib/redis.ts do Next.js.
"""
import json
import httpx
from config import settings


BASE = settings.upstash_redis_url
TOKEN = settings.upstash_redis_token
QUEUE_KEY = "frameagent:jobs:pending"
STATUS_PREFIX = "frameagent:job:"


def _headers() -> dict:
    return {"Authorization": f"Bearer {TOKEN}"}


def dequeue() -> dict | None:
    """LPOP — remove e retorna o próximo job da fila."""
    try:
        res = httpx.get(f"{BASE}/LPOP/{QUEUE_KEY}", headers=_headers(), timeout=5)
        data = res.json()
        if data.get("result") is None:
            return None
        return json.loads(data["result"])
    except Exception:
        return None


def queue_length() -> int:
    try:
        res = httpx.get(f"{BASE}/LLEN/{QUEUE_KEY}", headers=_headers(), timeout=5)
        return res.json().get("result", 0)
    except Exception:
        return 0


def set_job_status(job_id: str, status: dict, ttl_s: int = 86400) -> None:
    """Salva status do job no Redis (TTL 24h)."""
    key = f"{STATUS_PREFIX}{job_id}"
    value = json.dumps(status)
    try:
        httpx.get(f"{BASE}/SET/{key}/{value}/EX/{ttl_s}", headers=_headers(), timeout=5)
    except Exception:
        pass
