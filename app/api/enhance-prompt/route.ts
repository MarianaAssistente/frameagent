/**
 * POST /api/enhance-prompt
 * Melhora o prompt usando LLM (OpenRouter → OpenAI → Gemini → Anthropic → fallback heurístico)
 */

export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptApiKey } from "@/lib/vault";

const SYSTEM_PROMPT_TEMPLATE =
  "You are an expert prompt engineer for AI image generation models like FLUX, Stable Diffusion, Midjourney, and DALL-E.\n\n" +
  "Your task is to transform the user's basic prompt into a rich, detailed prompt that will produce stunning, high-quality images.\n\n" +
  "Rules:\n" +
  "1. Keep the EXACT SAME LANGUAGE as the input (if Portuguese, respond in Portuguese; if English, respond in English)\n" +
  "2. Preserve the original intent and subject completely\n" +
  "3. Add: visual style, lighting, composition, mood, technical details (camera angle, lens, etc.)\n" +
  "4. Add relevant artistic references if appropriate\n" +
  "5. Keep it under 200 words\n" +
  "6. Return ONLY the improved prompt — no explanations, no \"Here is:\", no quotes\n\n" +
  "Input type context: {type} (adjust style for this format: image=photographic, post=instagram, reel=cinematic vertical, story=vertical social, avatar=portrait)";

const SYSTEM_GEMINI_KEY = process.env.GEMINI_API_KEY ?? "AIzaSyBAgdy71pWjPmx6Od52pu-YhL50m5XfqaU";

async function getLLMKey(userId: string, provider: string): Promise<string | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("frameagent_api_keys")
    .select("key_encrypted")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!data?.key_encrypted) return null;
  try { return decryptApiKey(data.key_encrypted); } catch { return null; }
}

function buildSystemPrompt(type: string): string {
  return SYSTEM_PROMPT_TEMPLATE.replace("{type}", type);
}

async function enhanceWithOpenRouter(key: string, prompt: string, type: string): Promise<string> {
  const sysPrompt = buildSystemPrompt(type);
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "meta-llama/llama-3.1-8b-instruct:free",
      messages: [
        { role: "system", content: sysPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function enhanceWithOpenAI(key: string, prompt: string, type: string): Promise<string> {
  const sysPrompt = buildSystemPrompt(type);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sysPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function enhanceWithGemini(key: string, prompt: string, type: string): Promise<string> {
  const sysPrompt = buildSystemPrompt(type);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${sysPrompt}\n\nPrompt to improve:\n${prompt}` }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(15_000),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

async function enhanceWithAnthropic(key: string, prompt: string, type: string): Promise<string> {
  const sysPrompt = buildSystemPrompt(type);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      system: sysPrompt,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text?.trim() ?? "";
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body  = await req.json().catch(() => ({}));
  const prompt: string = body.prompt ?? "";
  const type: string   = body.type ?? "image";

  if (!prompt.trim())
    return NextResponse.json({ error: "Prompt obrigatório" }, { status: 400 });

  // Buscar usuário interno
  const db = supabaseAdmin();
  const { data: user } = await db
    .from("frameagent_users")
    .select("id")
    .eq("clerk_user_id", clerkId)
    .single();

  if (!user)
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const userId = user.id;

  // Tentar providers em ordem
  const providers: Array<{ name: string; fn: () => Promise<string> }> = [];

  // Nano-banana (fal.ai) — text model via fal.ai
  const falKey = await getLLMKey(userId, "fal");
  if (falKey) {
    providers.push({
      name: "nano-banana",
      fn: async () => {
        const sysPrompt = buildSystemPrompt(type);
        const res = await fetch("https://fal.run/fal-ai/any-llm", {
          method: "POST",
          headers: {
            "Authorization": `Key ${falKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-flash-1.5-8b",
            prompt: `${sysPrompt}\n\nPrompt to improve:\n${prompt}`,
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) throw new Error(`fal.ai ${res.status}`);
        const data = await res.json();
        const enhanced = data.output ?? data.text ?? data.result ?? "";
        return enhanced;
      },
    });
  }

  const orKey = await getLLMKey(userId, "openrouter");
  if (orKey) providers.push({ name: "openrouter", fn: () => enhanceWithOpenRouter(orKey, prompt, type) });

  const oaiKey = await getLLMKey(userId, "openai");
  if (oaiKey) providers.push({ name: "openai", fn: () => enhanceWithOpenAI(oaiKey, prompt, type) });

  const gemKey = await getLLMKey(userId, "gemini");
  if (gemKey) providers.push({ name: "gemini", fn: () => enhanceWithGemini(gemKey, prompt, type) });

  const antKey = await getLLMKey(userId, "anthropic");
  if (antKey) providers.push({ name: "anthropic", fn: () => enhanceWithAnthropic(antKey, prompt, type) });

  // Gemini do sistema como fallback (sempre disponível)
  providers.push({ name: "gemini-system", fn: () => enhanceWithGemini(SYSTEM_GEMINI_KEY, prompt, type) });

  for (const p of providers) {
    try {
      const enhanced = await p.fn();
      if (enhanced && enhanced.length > prompt.length / 2) {
        return NextResponse.json({ enhanced, provider: p.name });
      }
    } catch (e: any) {
      console.warn(`[enhance-prompt] ${p.name} failed:`, e.message);
    }
  }

  // Nunca deveria chegar aqui, mas por segurança
  return NextResponse.json({ error: "Falha ao melhorar prompt" }, { status: 500 });
}
