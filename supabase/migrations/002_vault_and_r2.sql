-- ════════════════════════════════════════════════════════════════
-- FrameAgent — Migração 002: Vault BYOK + R2 Storage
-- Criado em: 19/03/2026 por Hefesto
-- ════════════════════════════════════════════════════════════════

-- Adicionar coluna key_encrypted na tabela de API keys
-- (ciphertext AES-256-GCM serializado como JSON)
ALTER TABLE frameagent_api_keys
  ADD COLUMN IF NOT EXISTS key_encrypted TEXT;

-- Adicionar índice de busca por hash (para verificar duplicatas sem decriptar)
CREATE INDEX IF NOT EXISTS idx_fa_api_keys_hash
  ON frameagent_api_keys(key_hash);

-- Tabela de logs de uso de keys (para analytics e rate limiting)
CREATE TABLE IF NOT EXISTS frameagent_key_usage_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_id      UUID NOT NULL REFERENCES frameagent_api_keys(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES frameagent_users(id) ON DELETE CASCADE,
  job_id      UUID REFERENCES frameagent_jobs(id) ON DELETE SET NULL,
  provider    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'success', -- 'success' | 'error' | 'rate_limited'
  error_msg   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fa_key_usage_key_id  ON frameagent_key_usage_logs(key_id);
CREATE INDEX IF NOT EXISTS idx_fa_key_usage_user_id ON frameagent_key_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_fa_key_usage_created ON frameagent_key_usage_logs(created_at DESC);

-- Tabela de assets R2 (link entre Supabase e Cloudflare R2)
-- A tabela frameagent_assets já existe, mas vamos adicionar r2_key se necessário
ALTER TABLE frameagent_assets
  ADD COLUMN IF NOT EXISTS r2_key TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Índice para limpeza de assets expirados
CREATE INDEX IF NOT EXISTS idx_fa_assets_expires ON frameagent_assets(expires_at)
  WHERE expires_at IS NOT NULL;

-- Atualizar tabela de jobs com campos de output
ALTER TABLE frameagent_jobs
  ADD COLUMN IF NOT EXISTS output_asset_id UUID REFERENCES frameagent_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- View para dashboard: jobs com asset info
CREATE OR REPLACE VIEW frameagent_jobs_view AS
  SELECT
    j.*,
    a.url    AS asset_url,
    a.type   AS asset_type,
    a.r2_key AS asset_r2_key
  FROM frameagent_jobs j
  LEFT JOIN frameagent_assets a ON j.output_asset_id = a.id;
