/**
 * GET /api/keys/balance?keyId=<uuid>
 * Decripta a API key no servidor, chama o provider e retorna o saldo.
 * A key nunca é exposta ao cliente.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptApiKey } from "@/lib/vault";

// ─── Fetchers por provider ─────────────────────────────────────────────────────

interface BalanceResult {
  available: boolean;
  balance?: number;       // valor numérico (USD ou unidade do provider)
  unit?: string;          // "USD" | "characters" | "credits"
  label?: string;         // texto formatado para exibir
  raw?: Record<string, any>;
  error?: string;
}

async function fetchFalBalance(key: string): Promise<BalanceResult> {
  try {
    const res = await fetch("https://fal.run/fal-ai/credits", {
      headers: { Authorization: `Key ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { available: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    // fal.ai retorna { balance: number } em USD
    const balance = data?.balance ?? data?.credits ?? 0;
    return { available: true, balance: Number(balance), unit: "USD", raw: data };
  } catch (e: any) {
    return { available: false, error: e.message };
  }
}

async function fetchOpenAIBalance(key: string): Promise<BalanceResult> {
  try {
    const res = await fetch("https://api.openai.com/v1/dashboard/billing/credit_grants", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) {
      // API paga — endpoint de grants não existe; tentar subscription
      const res2 = await fetch("https://api.openai.com/v1/dashboard/billing/subscription", {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!res2.ok) return { available: false, error: `HTTP ${res2.status}` };
      const data2 = await res2.json();
      const balance = data2?.hard_limit_usd ?? data2?.system_hard_limit_usd ?? null;
      if (balance == null) return { available: false, error: "Saldo não disponível para esta conta" };
      return { available: true, balance: Number(balance), unit: "USD", raw: data2 };
    }
    if (!res.ok) return { available: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    const granted   = data?.total_granted   ?? 0;
    const used      = data?.total_used      ?? 0;
    const available = data?.total_available ?? (granted - used);
    return { available: true, balance: Number(available), unit: "USD", raw: data };
  } catch (e: any) {
    return { available: false, error: e.message };
  }
}

async function fetchElevenLabsBalance(key: string): Promise<BalanceResult> {
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      headers: { "xi-api-key": key },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { available: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    const limit = data?.character_limit   ?? 0;
    const used  = data?.character_count   ?? 0;
    const remaining = limit - used;
    return {
      available: true,
      balance:   remaining,
      unit:      "characters",
      label:     `${remaining.toLocaleString()} chars restantes`,
      raw:       data,
    };
  } catch (e: any) {
    return { available: false, error: e.message };
  }
}

async function fetchCreatomateBalance(key: string): Promise<BalanceResult> {
  try {
    const res = await fetch("https://api.creatomate.com/v1/account", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { available: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    // Creatomate retorna renders ou créditos restantes
    const renders = data?.renders_remaining ?? data?.balance ?? null;
    if (renders == null) return { available: false, error: "Campo de saldo não encontrado" };
    return {
      available: true,
      balance:   Number(renders),
      unit:      "renders",
      label:     `${renders} renders`,
      raw:       data,
    };
  } catch (e: any) {
    return { available: false, error: e.message };
  }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

async function fetchBalance(provider: string, key: string): Promise<BalanceResult> {
  switch (provider) {
    case "fal.ai":     return fetchFalBalance(key);
    case "openai":     return fetchOpenAIBalance(key);
    case "elevenlabs": return fetchElevenLabsBalance(key);
    case "creatomate": return fetchCreatomateBalance(key);
    default:
      return { available: false, error: "Consulta de saldo não suportada para este provider" };
  }
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keyId = req.nextUrl.searchParams.get("keyId");
  if (!keyId) return NextResponse.json({ error: "keyId obrigatório" }, { status: 400 });

  const db = supabaseAdmin();

  // Buscar user interno
  const { data: user } = await db
    .from("frameagent_users")
    .select("id")
    .eq("clerk_user_id", clerkId)
    .single();
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  // Buscar key — garante que pertence ao usuário
  const { data: apiKey } = await db
    .from("frameagent_api_keys")
    .select("id, provider, key_encrypted")
    .eq("id", keyId)
    .eq("user_id", user.id)
    .single();

  if (!apiKey) return NextResponse.json({ error: "Key não encontrada" }, { status: 404 });
  if (!apiKey.key_encrypted) return NextResponse.json({ error: "Key não criptografada — recadastre" }, { status: 422 });

  // Decrypt no servidor — nunca sai daqui
  let plainKey: string;
  try {
    plainKey = decryptApiKey(apiKey.key_encrypted);
  } catch {
    return NextResponse.json({ error: "Falha ao decriptar key" }, { status: 500 });
  }

  const result = await fetchBalance(apiKey.provider, plainKey);

  // Atualizar last_used_at
  await db.from("frameagent_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyId);

  return NextResponse.json({ provider: apiKey.provider, ...result });
}
