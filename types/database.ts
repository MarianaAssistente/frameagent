// ─── Database Types (auto-generated from schema) ─────────────────────

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";
export type JobType   = "image_generation" | "video_generation" | "avatar_lipsync" | "reel_compose" | "image_edit" | "b_roll";
export type PlanTier  = "free" | "starter" | "pro" | "agency";

export interface User {
  id: string;
  clerk_user_id: string;
  email: string;
  name: string;
  plan: PlanTier;
  credits: number;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  type: JobType;
  status: JobStatus;
  prompt: string;
  parameters: Record<string, any>;
  provider: string;          // e.g. "fal.ai/flux", "hedra", "elevenlabs"
  provider_job_id?: string;
  result_url?: string;
  error_message?: string;
  credits_used: number;
  duration_ms?: number;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  user_id: string;
  job_id?: string;
  name: string;
  type: "image" | "video" | "audio" | "document";
  url: string;
  size_bytes?: number;
  mime_type?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  provider: string;   // "fal.ai" | "elevenlabs" | "hedra" | "gemini" | "openai" etc.
  label: string;
  key_hash: string;   // SHA-256 hash for verification
  key_preview: string; // first 8 chars + "..."
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;     // positive = credit, negative = debit
  balance_after: number;
  description: string;
  job_id?: string;
  stripe_payment_id?: string;
  created_at: string;
}

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  price_monthly: number;
  price_yearly: number;
  credits_monthly: number;
  features: string[];
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
}
