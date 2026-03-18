"""
FrameAgent Worker — Processador de Jobs
Consome da fila Redis e processa via fal.ai
"""
import httpx
import uuid
from datetime import datetime, timezone
from supabase import create_client, Client
from config import settings
from vault import decrypt_api_key
from redis_queue import set_job_status
import logging

logger = logging.getLogger("processor")

# Modelos fal.ai suportados
FAL_MODELS = {
    "fal-ai/flux/schnell": {"steps": 4,  "name": "FLUX.2 Schnell"},
    "fal-ai/flux-pro":     {"steps": 28, "name": "FLUX.2 Pro"},
    "fal-ai/flux/dev":     {"steps": 28, "name": "FLUX.2 Dev"},
    "fal-ai/recraft-v3":   {"steps": 28, "name": "Recraft V3"},
    "fal-ai/ideogram/v2":  {"steps": 28, "name": "Ideogram V2"},
}

# Dimensões por tipo
TYPE_DIMS = {
    "image_generation": (1024, 1024),
    "reel_compose":     (1080, 1920),
    "image_edit":       (1024, 1024),
    "b_roll":           (1920, 1080),
    "avatar_lipsync":   (512,  512),
    "video_generation": (1080, 1920),
}


def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_key)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def mark_failed(db: Client, job_id: str, error: str) -> None:
    db.table("frameagent_jobs").update({
        "status":        "failed",
        "error_message": error[:500],
        "completed_at":  now_iso(),
    }).eq("id", job_id).execute()
    set_job_status(job_id, {"state": "failed", "error": error})
    logger.error(f"[job:{job_id[:8]}] FAILED — {error}")


def process_job(job_payload: dict) -> bool:
    """
    Processa um job da fila.
    Retorna True se concluído (done ou failed), False se deve ser recolocado na fila.
    """
    job_id      = job_payload.get("id")
    user_id     = job_payload.get("userId")   # clerk_user_id
    prompt      = job_payload.get("payload", {}).get("prompt", "")
    job_type    = job_payload.get("payload", {}).get("type", "image_generation")
    model_id    = job_payload.get("payload", {}).get("model", "fal-ai/flux/schnell")

    if not all([job_id, user_id, prompt]):
        logger.warning(f"Payload inválido: {job_payload}")
        return True  # descarta

    logger.info(f"[job:{job_id[:8]}] Iniciando — model={model_id}, type={job_type}")
    db = get_supabase()

    set_job_status(job_id, {"state": "processing", "progress": 5, "message": "Worker iniciando..."})

    # Buscar user interno
    user_res = db.table("frameagent_users").select("id, credits").eq("clerk_user_id", user_id).single().execute()
    if not user_res.data:
        mark_failed(db, job_id, f"Usuário clerk:{user_id} não encontrado no banco")
        return True

    internal_user_id = user_res.data["id"]
    credits = user_res.data.get("credits", 0)

    if credits < 5:
        mark_failed(db, job_id, "Créditos insuficientes")
        return True

    # Buscar e decriptar key fal.ai
    keys_res = db.table("frameagent_api_keys") \
        .select("key_encrypted") \
        .eq("user_id", internal_user_id) \
        .eq("provider", "fal.ai") \
        .eq("is_active", True) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()

    if not keys_res.data:
        mark_failed(db, job_id, "Nenhuma API key fal.ai configurada para este usuário")
        return True

    try:
        fal_key = decrypt_api_key(keys_res.data[0]["key_encrypted"])
    except Exception as e:
        mark_failed(db, job_id, f"Erro ao decriptar key fal.ai: {e}")
        return True

    set_job_status(job_id, {"state": "processing", "progress": 20, "message": "Enviando para fal.ai..."})

    # Dimensões
    width, height = TYPE_DIMS.get(job_type, (1024, 1024))
    model_cfg = FAL_MODELS.get(model_id, {"steps": 4, "name": model_id})

    # Chamar fal.ai
    try:
        with httpx.Client(timeout=settings.job_timeout_s) as client:
            fal_res = client.post(
                f"https://fal.run/{model_id}",
                headers={
                    "Authorization": f"Key {fal_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "prompt": prompt,
                    "image_size": {"width": width, "height": height},
                    "num_inference_steps": model_cfg["steps"],
                    "num_images": 1,
                    "enable_safety_checker": True,
                    "output_format": "jpeg",
                },
            )
    except httpx.TimeoutException:
        mark_failed(db, job_id, f"Timeout após {settings.job_timeout_s}s aguardando fal.ai")
        return True
    except Exception as e:
        mark_failed(db, job_id, f"Erro na chamada fal.ai: {e}")
        return True

    if not fal_res.is_success:
        err_text = fal_res.text[:300]
        mark_failed(db, job_id, f"fal.ai HTTP {fal_res.status_code}: {err_text}")
        return True

    fal_data = fal_res.json()
    image_url = (fal_data.get("images") or [{}])[0].get("url") or fal_data.get("image", {}).get("url")

    if not image_url:
        mark_failed(db, job_id, f"fal.ai não retornou URL de imagem. Resposta: {str(fal_data)[:200]}")
        return True

    set_job_status(job_id, {"state": "processing", "progress": 80, "message": "Salvando asset..."})

    # Salvar asset
    asset_id = str(uuid.uuid4())
    try:
        db.table("frameagent_assets").insert({
            "id":        asset_id,
            "user_id":   internal_user_id,
            "job_id":    job_id,
            "type":      "image",
            "url":       image_url,
            "filename":  f"{job_type}_{job_id[:8]}.jpg",
            "mime_type": "image/jpeg",
            "width":     width,
            "height":    height,
            "metadata":  {"prompt": prompt, "model": model_id, "provider": "fal.ai"},
        }).execute()
    except Exception as e:
        logger.error(f"[job:{job_id[:8]}] Erro ao salvar asset: {e}")
        asset_id = None

    # Atualizar job
    db.table("frameagent_jobs").update({
        "status":       "done",
        "output_url":   image_url,
        "completed_at": now_iso(),
    }).eq("id", job_id).execute()

    # Debitar créditos
    db.table("frameagent_users").update({
        "credits": max(0, credits - 5)
    }).eq("id", internal_user_id).execute()

    # Registrar transação
    try:
        db.table("frameagent_credit_transactions").insert({
            "user_id":     internal_user_id,
            "amount":      -5,
            "type":        "usage",
            "description": f"Geração de imagem — {model_cfg['name']} (worker)",
            "job_id":      job_id,
        }).execute()
    except Exception:
        pass

    set_job_status(job_id, {
        "state": "done",
        "progress": 100,
        "result": {"imageUrl": image_url, "assetId": asset_id},
    })
    logger.info(f"[job:{job_id[:8]}] DONE — asset={asset_id}")
    return True
