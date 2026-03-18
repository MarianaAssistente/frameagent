-- Migration 002: Add key_encrypted column to frameagent_api_keys
-- Applied: 2026-03-18
-- Purpose: Store AES-256-GCM encrypted API key blobs

ALTER TABLE frameagent_api_keys 
  ADD COLUMN IF NOT EXISTS key_encrypted TEXT;

COMMENT ON COLUMN frameagent_api_keys.key_encrypted IS 
  'AES-256-GCM encrypted blob: JSON {iv, ciphertext, tag, version}. Master key lives only in VAULT_KEY env var.';
