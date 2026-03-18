"""
FrameAgent Worker — Vault AES-256-GCM
Decripta as API keys armazenadas no Supabase.
Compatível com o vault do Next.js (lib/vault.ts).
"""
import json
import os
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from config import settings


def _get_master_key() -> bytes:
    vault_key = settings.vault_key
    if not vault_key:
        raise ValueError("VAULT_KEY não configurada")

    # 64 hex chars → 32 bytes raw
    if len(vault_key) == 64:
        try:
            return bytes.fromhex(vault_key)
        except ValueError:
            pass

    # Fallback: PBKDF2 (mesma derivação do vault.ts)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"frameagent-salt-v1",
        iterations=100_000,
    )
    return kdf.derive(vault_key.encode())


def decrypt_api_key(encrypted_json: str) -> str:
    """
    Decripta blob AES-256-GCM gerado pelo vault.ts do Next.js.
    Formato: {"iv": "<hex>", "ciphertext": "<hex>", "tag": "<hex>", "version": 1}
    """
    blob = json.loads(encrypted_json)
    master_key = _get_master_key()

    iv         = bytes.fromhex(blob["iv"])
    ciphertext = bytes.fromhex(blob["ciphertext"])
    tag        = bytes.fromhex(blob["tag"])

    aesgcm = AESGCM(master_key)
    # GCM em Python: ciphertext + tag concatenados
    plaintext = aesgcm.decrypt(iv, ciphertext + tag, None)
    return plaintext.decode("utf-8")
