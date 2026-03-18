/**
 * /settings/api-keys — BYOK API Keys Management
 * Alias completo de /dashboard/keys com contexto de Settings
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Key, Plus, Eye, EyeOff, Trash2, CheckCircle, AlertCircle,
  RefreshCw, Shield, ExternalLink, Copy, Clock, Settings2, ChevronRight,
} from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiKey {
  id: string;
  provider: string;
  label: string;
  key_preview: string;
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
}

// ─── Provider config ─────────────────────────────────────────────────────────

const PROVIDERS: Record<string, {
  name: string; desc: string; docsUrl: string;
  icon: string; color: string; placeholder: string;
}> = {
  "fal.ai": {
    name:"fal.ai", icon:"🎬", color:"#9B7EC8",
    desc:"Geração de imagem/vídeo (FLUX, Kling, Seedance, Wan2.1)",
    docsUrl:"https://fal.ai/dashboard/keys",
    placeholder:"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  "elevenlabs": {
    name:"ElevenLabs", icon:"🎙️", color:"#F59E0B",
    desc:"Text-to-Speech e clonagem de voz",
    docsUrl:"https://elevenlabs.io/app/settings/api-keys",
    placeholder:"sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  "hedra": {
    name:"Hedra", icon:"🎭", color:"#06B6D4",
    desc:"Avatar lip sync realista (foto → vídeo falando)",
    docsUrl:"https://www.hedra.com/app/settings",
    placeholder:"sk_hedra_xxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  "gemini": {
    name:"Gemini (Google)", icon:"✨", color:"#4285F4",
    desc:"Geração de imagens com Imagen 4 (Google)",
    docsUrl:"https://aistudio.google.com/app/apikey",
    placeholder:"AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  },
  "openai": {
    name:"OpenAI", icon:"🤖", color:"#4ADE80",
    desc:"GPT-4o (roteiro/copy), DALL-E 3, Whisper (transcrição)",
    docsUrl:"https://platform.openai.com/api-keys",
    placeholder:"sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  "creatomate": {
    name:"Creatomate", icon:"🎞️", color:"#C9A84C",
    desc:"Composição final de vídeo 9:16 (legenda, logo, música)",
    docsUrl:"https://creatomate.com/dashboard/api",
    placeholder:"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
};

// ─── KeyCard ─────────────────────────────────────────────────────────────────

function KeyCard({ apiKey, onDelete }: { apiKey: ApiKey; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const provider = PROVIDERS[apiKey.provider];

  async function handleDelete() {
    if (!confirm(`Remover key "${apiKey.label}" (${apiKey.provider})?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/keys?id=${apiKey.id}`, { method: "DELETE" });
      if (res.ok) onDelete(apiKey.id);
    } finally { setDeleting(false); }
  }

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/[0.02] hover:border-white/15 transition-colors group">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
        style={{ background:`${provider?.color ?? "#888"}18`, border:`1px solid ${provider?.color ?? "#888"}25` }}>
        {provider?.icon ?? "🔑"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white/90">{apiKey.label}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium"
            style={{ color:provider?.color ?? "#888", borderColor:`${provider?.color ?? "#888"}30`, background:`${provider?.color ?? "#888"}12` }}>
            {apiKey.provider}
          </span>
          {apiKey.is_active && (
            <span className="flex items-center gap-1 text-[10px] text-green-400/70">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>Ativa
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <code className="text-xs font-mono text-white/30">{apiKey.key_preview}</code>
          {apiKey.last_used_at && (
            <span className="text-[10px] text-white/20 flex items-center gap-1">
              <Clock size={9}/> {new Date(apiKey.last_used_at).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {provider?.docsUrl && (
          <a href={provider.docsUrl} target="_blank" rel="noopener"
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/25 hover:text-white/60 transition-colors">
            <ExternalLink size={13}/>
          </a>
        )}
        <button onClick={handleDelete} disabled={deleting}
          className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/25 hover:text-red-400 transition-colors">
          {deleting ? <RefreshCw size={13} className="animate-spin"/> : <Trash2 size={13}/>}
        </button>
      </div>
    </div>
  );
}

// ─── AddKeyForm ───────────────────────────────────────────────────────────────

function AddKeyForm({ onSuccess }: { onSuccess: (k: ApiKey) => void }) {
  const [open, setOpen]         = useState(false);
  const [provider, setProvider] = useState("");
  const [label, setLabel]       = useState("");
  const [key, setKey]           = useState("");
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res  = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, label, key }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro desconhecido"); return; }
      onSuccess(data.key);
      setOpen(false); setProvider(""); setLabel(""); setKey(""); setShow(false);
    } catch { setError("Falha na conexão"); }
    finally { setLoading(false); }
  }

  const cfg = provider ? PROVIDERS[provider] : null;

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-white/25 text-white/40 hover:text-white/70 transition-all text-sm">
      <Plus size={16}/> Adicionar API Key
    </button>
  );

  return (
    <div className="p-5 rounded-2xl border border-[#C9A84C]/25 bg-[#C9A84C]/5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Nova API Key</p>
        <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/60">✕</button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1.5">Provedor</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(PROVIDERS).map(([id, p]) => (
              <button key={id} type="button" onClick={() => setProvider(id)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                  provider === id ? "border-[#C9A84C]/40 bg-[#C9A84C]/10" : "border-white/8 hover:border-white/20"
                }`}>
                <span>{p.icon}</span>
                <span className="text-xs font-medium truncate">{p.name}</span>
              </button>
            ))}
          </div>
          {cfg && (
            <p className="text-[10px] text-white/35 mt-2">
              {cfg.desc} ·{" "}
              <a href={cfg.docsUrl} target="_blank" rel="noopener" className="text-[#C9A84C]/70 hover:text-[#C9A84C]">
                Obter key <ExternalLink size={9} className="inline"/>
              </a>
            </p>
          )}
        </div>
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1.5">Label</label>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="ex: produção"
            className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/40"/>
        </div>
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1.5">
            API Key <span className="text-white/20">— criptografada AES-256 antes de salvar</span>
          </label>
          <div className="relative">
            <input type={show ? "text" : "password"} value={key} onChange={e => setKey(e.target.value)}
              placeholder={cfg?.placeholder ?? "sk-..."}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:border-[#C9A84C]/40"/>
            <button type="button" onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
              {show ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
          </div>
          <p className="text-[10px] text-white/30 mt-1.5 flex items-center gap-1">
            <Shield size={10} className="text-green-400/60"/> Valor original nunca armazenado — só o blob GCM.
          </p>
        </div>
        {error && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={12}/>{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={loading || !provider || !label || !key || key.length < 20}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{ background:"#C9A84C", color:"#09090b" }}>
            {loading ? "Salvando..." : "Salvar key"}
          </button>
          <button type="button" onClick={() => setOpen(false)}
            className="px-4 py-2.5 rounded-xl text-sm border border-white/10 hover:border-white/25">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsApiKeysPage() {
  const [keys, setKeys]       = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const fetchKeys = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/keys");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKeys(data.keys ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const configuredProviders = new Set(keys.map(k => k.provider));

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-white/30 mb-6">
        <Link href="/dashboard/settings" className="hover:text-white/60 transition-colors">
          <Settings2 size={12} className="inline mr-1"/>Ajustes
        </Link>
        <ChevronRight size={12}/>
        <span className="text-white/60">API Keys</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Key size={20} className="text-[#C9A84C]"/>
          <h1 className="text-2xl font-bold">API Keys — BYOK</h1>
        </div>
        <p className="text-white/40 text-sm">
          Traga suas próprias keys. Você paga direto nas APIs — sem markup da plataforma.
          Todas criptografadas com AES-256-GCM antes de persistir.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label:"Configuradas", value:`${configuredProviders.size}/${Object.keys(PROVIDERS).length}`, color:"#C9A84C" },
          { label:"Keys Ativas",  value:keys.filter(k=>k.is_active).length,                             color:"#4ADE80" },
          { label:"Providers",    value:Object.keys(PROVIDERS).length,                                  color:"#71717A" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl border border-white/8 bg-white/[0.02] text-center">
            <p className="text-xl font-bold" style={{color:s.color}}>{s.value}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Security banner */}
      <div className="flex items-start gap-3 p-4 mb-6 bg-green-500/5 border border-green-500/20 rounded-2xl">
        <Shield size={15} className="text-green-400 flex-shrink-0 mt-0.5"/>
        <div>
          <p className="text-sm font-semibold text-green-400">Vault AES-256-GCM ativo</p>
          <p className="text-xs text-white/40 mt-0.5">
            Cada key recebe um IV único. A chave mestra (VAULT_KEY) vive apenas nas env vars — nunca no banco.
            Só o hash SHA-256 + preview são armazenados. Reversão impossível sem a chave mestra.
          </p>
        </div>
      </div>

      {/* Keys */}
      {loading ? (
        <div className="text-center py-12 text-white/25 text-sm flex items-center justify-center gap-2">
          <RefreshCw size={14} className="animate-spin"/> Carregando...
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-400 text-sm p-4 rounded-xl border border-red-500/20 bg-red-500/5 mb-4">
          <AlertCircle size={14}/> {error}
          <button onClick={fetchKeys} className="ml-auto text-xs underline">Tentar novamente</button>
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-10 text-white/20 mb-6">
          <Key size={32} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">Nenhuma key configurada</p>
          <p className="text-xs mt-1">Adicione suas keys para começar a gerar conteúdo</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {keys.map(k => <KeyCard key={k.id} apiKey={k} onDelete={id => setKeys(p => p.filter(k => k.id !== id))}/>)}
        </div>
      )}

      <AddKeyForm onSuccess={k => setKeys(p => [k, ...p])}/>

      {/* Provider guide */}
      <div className="mt-8 space-y-2">
        <p className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-3">Providers disponíveis</p>
        {Object.entries(PROVIDERS).map(([id, p]) => (
          <div key={id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5">
            <span className="text-base">{p.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{p.name}</p>
              <p className="text-[10px] text-white/35 truncate">{p.desc}</p>
            </div>
            {configuredProviders.has(id) ? (
              <CheckCircle size={14} className="text-green-400 flex-shrink-0"/>
            ) : (
              <a href={p.docsUrl} target="_blank" rel="noopener"
                className="text-[10px] text-white/25 hover:text-[#C9A84C] flex items-center gap-1 flex-shrink-0">
                Obter key <ExternalLink size={9}/>
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
