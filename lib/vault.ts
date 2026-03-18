/**
 * FrameAgent — Vault BYOK
 * Criptografia simétrica de API keys com AES-256-GCM
 * A chave mestra (VAULT_KEY) vive só nas env vars — nunca no DB
 *
 * Fluxo:
 *   salvar: encrypt(apiKey, VAULT_KEY) → { iv, ciphertext, tag } → Supabase
 *   ler:    decrypt(ciphertext, VAULT_KEY) → apiKey em memória → nunca no log
 */

import crypto from "crypto";

const ALGORITHM   = "aes-256-gcm";
const IV_LENGTH   = 12;   // GCM nonce
const TAG_LENGTH  = 16;   // auth tag bytes
const KEY_LENGTH  = 32;   // 256 bits

function getMasterKey(): Buffer {
  const vaultKey = process.env.VAULT_KEY;
  if (!vaultKey) throw new Error("VAULT_KEY env var not set");

  // Accept raw 32-byte hex (64 chars) or derive from passphrase with PBKDF2
  if (/^[0-9a-f]{64}$/i.test(vaultKey)) {
    return Buffer.from(vaultKey, "hex");
  }
  // Derive from passphrase (fallback for dev)
  return crypto.pbkdf2Sync(vaultKey, "frameagent-salt-v1", 100_000, KEY_LENGTH, "sha256");
}

export interface EncryptedBlob {
  iv:         string;   // hex
  ciphertext: string;   // hex
  tag:        string;   // hex
  version:    number;   // schema version, currently 1
}

/**
 * Criptografa uma API key.
 * O resultado (JSON string) é salvo no banco — o valor original nunca.
 */
export function encryptApiKey(plaintext: string): string {
  const masterKey = getMasterKey();
  const iv        = crypto.randomBytes(IV_LENGTH);
  const cipher    = crypto.createCipheriv(ALGORITHM, masterKey, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag       = cipher.getAuthTag();

  const blob: EncryptedBlob = {
    iv:         iv.toString("hex"),
    ciphertext: encrypted.toString("hex"),
    tag:        tag.toString("hex"),
    version:    1,
  };
  return JSON.stringify(blob);
}

/**
 * Decriptografa uma API key para uso em memória.
 * Nunca logar o resultado — use diretamente na chamada de API.
 */
export function decryptApiKey(encryptedJson: string): string {
  const masterKey              = getMasterKey();
  const blob: EncryptedBlob    = JSON.parse(encryptedJson);
  const iv                     = Buffer.from(blob.iv, "hex");
  const ciphertext             = Buffer.from(blob.ciphertext, "hex");
  const tag                    = Buffer.from(blob.tag, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * SHA-256 hash para preview e verificação de duplicatas
 * (nunca permite reverter para o original)
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Gera preview seguro: primeiros 8 chars + "..."
 */
export function previewApiKey(key: string): string {
  if (key.length <= 8) return "***";
  return key.slice(0, 8) + "...";
}

/**
 * Valida formato mínimo de API key (deve ter ≥ 20 chars)
 */
export function validateApiKeyFormat(key: string): boolean {
  return typeof key === "string" && key.trim().length >= 20;
}
