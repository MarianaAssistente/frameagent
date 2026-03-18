/**
 * FrameAgent — Upstash Redis Client
 * Usado para job queue, rate limiting e cache de status de jobs
 * 
 * Upstash Redis REST API — sem conexão persistente (edge-friendly)
 */

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redisRequest(command: string[]): Promise<any> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error("Upstash Redis não configurado (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)");
  }

  const res = await fetch(`${REDIS_URL}/${command.map(encodeURIComponent).join("/")}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });

  if (!res.ok) throw new Error(`Redis error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.result;
}

// ─── Job Queue ────────────────────────────────────────────────────────────────

export const JobQueue = {
  /**
   * Enfileira job (RPUSH na lista jobs:pending)
   */
  async enqueue(job: { id: string; type: string; userId: string; payload: Record<string, any> }): Promise<void> {
    const serialized = JSON.stringify({ ...job, enqueuedAt: new Date().toISOString() });
    await redisRequest(["RPUSH", "frameagent:jobs:pending", serialized]);
  },

  /**
   * Conta jobs pendentes
   */
  async pendingCount(): Promise<number> {
    return await redisRequest(["LLEN", "frameagent:jobs:pending"]) ?? 0;
  },

  /**
   * Peek nos próximos N jobs sem removê-los
   */
  async peek(count = 5): Promise<any[]> {
    const items = await redisRequest(["LRANGE", "frameagent:jobs:pending", "0", String(count - 1)]);
    return (items ?? []).map((s: string) => JSON.parse(s));
  },
};

// ─── Job Status Cache ─────────────────────────────────────────────────────────

export const JobStatus = {
  /**
   * Salva status de job (TTL 24h)
   */
  async set(jobId: string, status: {
    state: "queued" | "processing" | "done" | "failed";
    progress?: number;
    message?: string;
    result?: any;
    error?: string;
    updatedAt?: string;
  }): Promise<void> {
    const key = `frameagent:job:${jobId}`;
    const value = JSON.stringify({ ...status, updatedAt: new Date().toISOString() });
    await redisRequest(["SET", key, value, "EX", "86400"]); // 24h TTL
  },

  /**
   * Lê status de job
   */
  async get(jobId: string): Promise<any | null> {
    const value = await redisRequest(["GET", `frameagent:job:${jobId}`]);
    return value ? JSON.parse(value) : null;
  },
};

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

export const RateLimit = {
  /**
   * Verifica se user está dentro do rate limit
   * Retorna { ok: boolean, remaining: number, resetIn: number }
   */
  async check(userId: string, limitPerMinute = 10): Promise<{ ok: boolean; remaining: number }> {
    const key    = `frameagent:ratelimit:${userId}:${Math.floor(Date.now() / 60000)}`;
    const count  = await redisRequest(["INCR", key]) ?? 1;

    // Set TTL apenas no primeiro acesso
    if (count === 1) {
      await redisRequest(["EXPIRE", key, "60"]);
    }

    const remaining = Math.max(0, limitPerMinute - count);
    return { ok: count <= limitPerMinute, remaining };
  },
};
