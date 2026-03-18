/**
 * /api/keys — BYOK API Keys CRUD
 * GET  → listar keys do usuário (sem revelar valor criptografado)
 * POST → salvar nova key (criptografa antes de persistir)
 * DELETE → remover key
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { encryptApiKey, hashApiKey, previewApiKey, validateApiKeyFormat } from "@/lib/vault";

const ALLOWED_PROVIDERS = [
  "fal.ai", "elevenlabs", "hedra", "gemini", "openai", "creatomate",
] as const;

type Provider = typeof ALLOWED_PROVIDERS[number];

// ── GET /api/keys ─────────────────────────────────────────────────────────────
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();

  // Fetch user internal ID
  const { data: user } = await db
    .from("frameagent_users")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (!user) return NextResponse.json({ keys: [] });

  const { data: keys, error } = await db
    .from("frameagent_api_keys")
    .select("id, provider, label, key_preview, key_hash, is_active, last_used_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Never return key_encrypted — only preview
  return NextResponse.json({ keys: keys ?? [] });
}

// ── POST /api/keys ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { provider, label, key } = body;

  // Validate
  if (!ALLOWED_PROVIDERS.includes(provider as Provider))
    return NextResponse.json({ error: `Provider inválido. Use: ${ALLOWED_PROVIDERS.join(", ")}` }, { status: 400 });
  if (!label?.trim())
    return NextResponse.json({ error: "Label obrigatório" }, { status: 400 });
  if (!validateApiKeyFormat(key))
    return NextResponse.json({ error: "API key inválida (mínimo 20 caracteres)" }, { status: 400 });

  const db = supabaseAdmin();

  // Get or create user
  let { data: user } = await db
    .from("frameagent_users")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (!user) {
    const { data: newUser } = await db
      .from("frameagent_users")
      .insert({ clerk_user_id: userId, email: "", plan: "free", credits: 50 })
      .select("id")
      .single();
    user = newUser;
  }

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  // Check duplicate (same provider + label)
  const { data: existing } = await db
    .from("frameagent_api_keys")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .eq("label", label.trim())
    .single();

  if (existing)
    return NextResponse.json({ error: "Já existe uma key com esse provider e label" }, { status: 409 });

  // Encrypt and store
  const encrypted = encryptApiKey(key.trim());
  const keyHash   = hashApiKey(key.trim());
  const preview   = previewApiKey(key.trim());

  const { data: newKey, error } = await db
    .from("frameagent_api_keys")
    .insert({
      user_id:       user.id,
      provider:      provider as Provider,
      label:         label.trim(),
      key_encrypted: encrypted,  // add this column — see migration 002
      key_hash:      keyHash,
      key_preview:   preview,
      is_active:     true,
    })
    .select("id, provider, label, key_preview, is_active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ key: newKey }, { status: 201 });
}

// ── DELETE /api/keys?id=<uuid> ────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keyId = req.nextUrl.searchParams.get("id");
  if (!keyId) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const db = supabaseAdmin();

  const { data: user } = await db
    .from("frameagent_users")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const { error } = await db
    .from("frameagent_api_keys")
    .delete()
    .eq("id", keyId)
    .eq("user_id", user.id); // garante que só deleta as próprias keys

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
