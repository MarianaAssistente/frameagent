-- Migration 003: Extend jobs and assets tables
-- Applied: 2026-03-18

-- Jobs: add model, output_url, completed_at
ALTER TABLE frameagent_jobs ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE frameagent_jobs ADD COLUMN IF NOT EXISTS output_url TEXT;
ALTER TABLE frameagent_jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Assets: add filename, width, height for image metadata
ALTER TABLE frameagent_assets ADD COLUMN IF NOT EXISTS filename TEXT;
ALTER TABLE frameagent_assets ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE frameagent_assets ADD COLUMN IF NOT EXISTS height INTEGER;

-- Credit transactions: link to job
ALTER TABLE frameagent_credit_transactions 
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES frameagent_jobs(id);
