"""
FrameAgent Worker — FastAPI + Poll Loop
Consome jobs da fila Upstash Redis e processa via fal.ai
"""
import asyncio
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Header, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from config import settings
from redis_queue import dequeue, queue_length
from processor import process_job

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("main")

# ── Background poll loop ──────────────────────────────────────────────────────

_running = False


async def poll_loop():
    global _running
    logger.info(f"🚀 Worker iniciado — poll interval {settings.poll_interval_s}s")

    while _running:
        try:
            job = dequeue()
            if job:
                logger.info(f"📦 Job dequeued: {job.get('id','?')[:8]}")
                # Processar em thread pool para não bloquear o event loop
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, process_job, job)
            else:
                # Fila vazia — dormir antes de checar de novo
                await asyncio.sleep(settings.poll_interval_s)
        except Exception as e:
            logger.exception(f"Erro no poll loop: {e}")
            await asyncio.sleep(5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _running
    _running = True
    task = asyncio.create_task(poll_loop())
    logger.info("✅ Poll loop iniciado")
    yield
    _running = False
    task.cancel()
    logger.info("🛑 Worker encerrado")


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="FrameAgent Worker",
    description="Worker de processamento assíncrono de jobs de geração de imagem/vídeo",
    version="1.0.0",
    lifespan=lifespan,
)


def verify_secret(x_worker_secret: str = Header(default="")) -> None:
    if x_worker_secret != settings.worker_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    q_len = queue_length()
    return {
        "status":      "ok",
        "worker":      "running" if _running else "stopped",
        "queue_length": q_len,
        "timestamp":   time.time(),
    }


# ── Manual trigger (webhook do Next.js pode chamar) ──────────────────────────

@app.post("/process")
async def process_endpoint(
    payload: dict,
    background_tasks: BackgroundTasks,
    x_worker_secret: str = Header(default=""),
):
    """
    Processa um job diretamente (sem passar pela fila Redis).
    Útil para testes e para o Next.js acionar diretamente.
    """
    verify_secret(x_worker_secret)

    if not payload.get("id"):
        raise HTTPException(status_code=400, detail="Campo 'id' obrigatório")

    background_tasks.add_task(process_job, payload)
    return {"queued": True, "job_id": payload["id"]}


# ── Queue info ────────────────────────────────────────────────────────────────

@app.get("/queue")
async def queue_info(x_worker_secret: str = Header(default="")):
    verify_secret(x_worker_secret)
    return {
        "queue_length": queue_length(),
        "worker_running": _running,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=False)
