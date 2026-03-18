-- ════════════════════════════════════════════════════════════════
-- FrameAgent — Schema Inicial (Migração 001)
-- Criado em: 18/03/2026 por Hefesto
-- ════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── plans ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS frameagent_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier            TEXT NOT NULL UNIQUE CHECK (tier IN ('free','starter','pro','agency')),
  name            TEXT NOT NULL,
  price_monthly   INTEGER NOT NULL DEFAULT 0,  -- cents
  price_yearly    INTEGER NOT NULL DEFAULT 0,  -- cents
  credits_monthly INTEGER NOT NULL DEFAULT 0,
  features        JSONB NOT NULL DEFAULT '[]',
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO frameagent_plans (tier, name, price_monthly, price_yearly, credits_monthly, features) VALUES
  ('free',    'Free',    0,      0,       50,   '["5 jobs/dia","Marca dágua","Resolução 720p"]'),
  ('starter', 'Starter', 2900,  29000,   500,  '["50 jobs/dia","Sem marca dágua","1080p","BYOK"]'),
  ('pro',     'Pro',     7900,  79000,   2000, '["Jobs ilimitados","4K","Todos os modelos","API Access"]'),
  ('agency',  'Agency',  24900, 249000,  10000,'["Tudo do Pro","White label","5 membros","SLA 99.9%"]')
ON CONFLICT (tier) DO NOTHING;

-- ── users ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS frameagent_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL,
  name          TEXT,
  plan          TEXT NOT NULL DEFAULT 'free' REFERENCES frameagent_plans(tier),
  credits       INTEGER NOT NULL DEFAULT 50,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── api_keys (BYOK) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS frameagent_api_keys (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES frameagent_users(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL,   -- 'fal.ai', 'elevenlabs', 'hedra', 'gemini', 'openai'
  label        TEXT NOT NULL,
  key_hash     TEXT NOT NULL,   -- SHA-256 of actual key
  key_preview  TEXT NOT NULL,   -- first 8 chars + '...'
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider, label)
);

-- ── jobs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS frameagent_jobs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES frameagent_users(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN (
                     'image_generation','video_generation','avatar_lipsync',
                     'reel_compose','image_edit','b_roll'
                   )),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                     'pending','processing','completed','failed','cancelled'
                   )),
  prompt           TEXT,
  parameters       JSONB NOT NULL DEFAULT '{}',
  provider         TEXT,
  provider_job_id  TEXT,
  result_url       TEXT,
  error_message    TEXT,
  credits_used     INTEGER NOT NULL DEFAULT 0,
  duration_ms      INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── assets ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS frameagent_assets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES frameagent_users(id) ON DELETE CASCADE,
  job_id      UUID REFERENCES frameagent_jobs(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('image','video','audio','document')),
  url         TEXT NOT NULL,
  size_bytes  BIGINT,
  mime_type   TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── credit_transactions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS frameagent_credit_transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES frameagent_users(id) ON DELETE CASCADE,
  amount              INTEGER NOT NULL,
  balance_after       INTEGER NOT NULL,
  description         TEXT NOT NULL,
  job_id              UUID REFERENCES frameagent_jobs(id) ON DELETE SET NULL,
  stripe_payment_id   TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fa_jobs_user_id     ON frameagent_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_fa_jobs_status      ON frameagent_jobs(status);
CREATE INDEX IF NOT EXISTS idx_fa_jobs_created     ON frameagent_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fa_assets_user_id   ON frameagent_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_fa_assets_job_id    ON frameagent_assets(job_id);
CREATE INDEX IF NOT EXISTS idx_fa_api_keys_user    ON frameagent_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_fa_credits_user     ON frameagent_credit_transactions(user_id);

-- ── updated_at triggers ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fa_users_updated_at
  BEFORE UPDATE ON frameagent_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER fa_jobs_updated_at
  BEFORE UPDATE ON frameagent_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ───────────────────────────────────────────────────────────────
ALTER TABLE frameagent_users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE frameagent_jobs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE frameagent_assets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE frameagent_api_keys          ENABLE ROW LEVEL SECURITY;
ALTER TABLE frameagent_credit_transactions ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically; policies for anon reads:
-- (All data is user-scoped — actual RLS policies enforced server-side via service role)
