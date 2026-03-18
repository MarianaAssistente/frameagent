"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Key, Plus, Eye, EyeOff, Trash2, CheckCircle, AlertCircle,
  RefreshCw, Shield, ExternalLink, Clock, X,
} from "lucide-react";

interface ApiKey {
  id: string;
  provider: string;
  label: string;
  key_preview: string;
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
}

const PROVIDERS: Record<string, {
  name: string; desc: string; docsUrl: string; icon: string; color: string; placeholder: string;
}> = {
  "fal.ai":      { name:"fal.ai",           icon:"🎬", color:"#9B7EC8", desc:"FLUX, Kling, Seedance, Wan2.1",    docsUrl:"https://fal.ai/dashboard/keys",                   placeholder:"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:xxxxxx" },
  "elevenlabs":  { name:"ElevenLabs",        icon:"🎙️", color:"#F59E0B", desc:"Text-to-Speech & voz",            docsUrl:"https://elevenlabs.io/app/settings/api-keys",     placeholder:"sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"          },
  "hedra":       { name:"Hedra",             icon:"🎭", color:"#06B6D4", desc:"Avatar lip sync",                  docsUrl:"https://www.hedra.com/app/settings",              placeholder:"sk_hedra_xxxxxxxxxxxxxxxxx"                    },
  "gemini":      { name:"Gemini",            icon:"✨", color:"#4285F4", desc:"Imagen 4 (Google)",               docsUrl:"https://aistudio.google.com/app/apikey",          placeholder:"AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX"             },
  "openai":      { name:"OpenAI",            icon:"🤖", color:"#4ADE80", desc:"GPT-4o, DALL-E 3, Whisper",      docsUrl:"https://platform.openai.com/api-keys",            placeholder:"sk-proj-xxxxxxxxxxxxxxxxxxxx"                  },
  "creatomate":  { name:"Creatomate",        icon:"🎞️", color:"#C9A84C", desc:"Composição de vídeo 9:16",       docsUrl:"https://creatomate.com/dashboard/api",            placeholder:"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"           },
};

// ─── Key Card ─────────────────────────────────────────────────────────────────

function KeyCard({ apiKey, onDelete }: { apiKey: ApiKey; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const p = PROVIDERS[apiKey.provider];

  async function handleDelete() {
    if (!confirm(`Remover "${apiKey.label}" (${apiKey.provider})?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/keys?id=${apiKey.id}`, { method: "DELETE" });
      if (res.ok) onDelete(apiKey.id);
    } finally { setDeleting(false); }
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl border border-white/8 bg-white/[0.02] active:bg-white/5 transition-colors">
      {/* Icon */}
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background:`${p?.color ?? "#888"}18`, border:`1px solid ${p?.color ?? "#888"}25` }}>
        {p?.icon ?? "🔑"}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-semibold text-white/90 truncate">{apiKey.label}</span>
          {apiKey.is_active && (
            <span className="flex items-center gap-1 text-[11px] text-green-400/80 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>Ativa
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ color:p?.color ?? "#888", background:`${p?.color ?? "#888"}15`, border:`1px solid ${p?.color ?? "#888"}25` }}>
            {apiKey.provider}
          </span>
          <code className="text-xs font-mono text-white/30">{apiKey.key_preview}</code>
        </div>
        {apiKey.last_used_at && (
          <p className="text-[11px] text-white/20 mt-1 flex items-center gap-1">
            <Clock size={10}/> {new Date(apiKey.last_used_at).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>
      {/* Delete */}
      <button onClick={handleDelete} disabled={deleting}
        className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-red-500/10 active:bg-red-500/20 text-white/25 hover:text-red-400 transition-colors flex-shrink-0"
        aria-label="Remover key">
        {deleting ? <RefreshCw size={16} className="animate-spin"/> : <Trash2 size={16}/>}
      </button>
    </div>
  );
}

// ─── Add Key Modal (bottom sheet on mobile) ───────────────────────────────────

function AddKeySheet({ onSuccess, onClose }: { onSuccess: (k: ApiKey) => void; onClose: () => void }) {
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
      if (!res.ok) { setError(data.error ?? "Erro"); return; }
      onSuccess(data.key);
      onClose();
    } catch { setError("Falha na conexão"); }
    finally { setLoading(false); }
  }

  const cfg = provider ? PROVIDERS[provider] : null;
  const canSubmit = provider && label.trim() && key.length >= 20;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={onClose}/>
      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-[#111] border-t border-white/10 rounded-t-3xl md:hidden max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom:"env(safe-area-inset-bottom, 16px)" }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20"/>
        </div>
        <div className="px-5 pb-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Nova API Key</h2>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5">
              <X size={18} className="text-white/50"/>
            </button>
          </div>
          <form onSubmit={submit} className="space-y-5">
            {/* Provider grid */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-3">Provedor</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PROVIDERS).map(([id, p]) => (
                  <button key={id} type="button" onClick={() => setProvider(id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all min-h-[56px] ${
                      provider === id ? "border-[#C9A84C]/50 bg-[#C9A84C]/10" : "border-white/8 hover:border-white/20 active:bg-white/5"
                    }`}>
                    <span className="text-xl">{p.icon}</span>
                    <span className="text-sm font-medium">{p.name}</span>
                  </button>
                ))}
              </div>
              {cfg && (
                <p className="text-sm text-white/35 mt-2">
                  {cfg.desc} ·{" "}
                  <a href={cfg.docsUrl} target="_blank" rel="noopener" className="text-[#C9A84C]/80 underline">
                    Obter key
                  </a>
                </p>
              )}
            </div>

            {/* Label */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Label</label>
              <input
                value={label} onChange={e => setLabel(e.target.value)}
                placeholder="ex: produção, pessoal"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
                style={{ fontSize:"16px" /* prevents iOS zoom */ }}
              />
            </div>

            {/* Key input */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                API Key <span className="text-white/30 font-normal">— criptografada AES-256</span>
              </label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={key} onChange={e => setKey(e.target.value)}
                  placeholder={cfg?.placeholder ?? "sk-..."}
                  autoComplete="off"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-12 text-base font-mono focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
                  style={{ fontSize:"16px" }}
                />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/30 hover:text-white/60">
                  {show ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
              <p className="text-xs text-white/30 mt-2 flex items-center gap-1">
                <Shield size={11} className="text-green-400/70"/> Valor original nunca armazenado
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                <AlertCircle size={14}/> {error}
              </div>
            )}

            <button type="submit" disabled={loading || !canSubmit}
              className="w-full py-4 rounded-xl text-base font-bold min-h-[56px] transition-all disabled:opacity-40 active:scale-[0.98]"
              style={{ background:"#C9A84C", color:"#09090b" }}>
              {loading ? "Salvando..." : "Salvar API Key"}
            </button>
          </form>
        </div>
      </div>

      {/* Desktop modal (md+) */}
      <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center bg-black/60" onClick={onClose}>
        <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4 mx-4"
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Nova API Key</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">
              <X size={16} className="text-white/50"/>
            </button>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Provedor</label>
              <div className="grid grid-cols-3 gap-2">
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
            </div>
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-1.5">Label</label>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="ex: produção"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/40"/>
            </div>
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-1.5">
                API Key <span className="text-white/20">— AES-256-GCM</span>
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
            </div>
            {error && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={12}/>{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={loading || !canSubmit}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{ background:"#C9A84C", color:"#09090b" }}>
                {loading ? "Salvando..." : "Salvar key"}
              </button>
              <button type="button" onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm border border-white/10 hover:border-white/25">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KeysPage() {
  const [keys, setKeys]       = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [showAdd, setShowAdd] = useState(false);

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
  const totalProviders = Object.keys(PROVIDERS).length;

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto md:max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6 md:mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Key size={22} className="text-[#C9A84C]"/>
            <h1 className="text-2xl md:text-3xl font-bold">API Keys</h1>
          </div>
          <p className="text-base text-white/40">BYOK — sem markup de API</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm flex-shrink-0 min-h-[48px] transition-all hover:brightness-110 active:scale-[0.97]"
          style={{ background:"#C9A84C", color:"#09090b" }}>
          <Plus size={16}/>
          <span className="hidden sm:inline">Adicionar</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 mb-6 md:gap-3 md:mb-8">
        {[
          { label:"Configuradas", value:`${configuredProviders.size}/${totalProviders}`, color:"#C9A84C" },
          { label:"Ativas",       value:keys.filter(k=>k.is_active).length,              color:"#4ADE80" },
          { label:"Providers",    value:totalProviders,                                  color:"#71717A" },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl border border-white/8 bg-white/[0.02] text-center md:p-4">
            <p className="text-xl font-bold md:text-2xl" style={{color:s.color}}>{s.value}</p>
            <p className="text-[11px] text-white/30 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Vault banner */}
      <div className="flex items-start gap-3 p-4 mb-6 bg-green-500/5 border border-green-500/20 rounded-2xl">
        <Shield size={16} className="text-green-400 flex-shrink-0 mt-0.5"/>
        <div>
          <p className="text-sm font-semibold text-green-400">Vault AES-256-GCM</p>
          <p className="text-sm text-white/40 mt-0.5 leading-relaxed">
            Keys criptografadas — valor original nunca armazenado.
          </p>
        </div>
      </div>

      {/* Keys list */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-white/25 text-sm">
          <RefreshCw size={16} className="animate-spin"/> Carregando...
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-400 text-sm p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <AlertCircle size={14}/> {error}
          <button onClick={fetchKeys} className="ml-auto text-xs underline">Tentar novamente</button>
        </div>
      ) : keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Key size={28} className="text-white/20"/>
          </div>
          <p className="text-base font-semibold text-white/40">Nenhuma key configurada</p>
          <p className="text-sm text-white/25 mt-1 max-w-xs">Adicione suas keys para começar a gerar conteúdo</p>
          <button onClick={() => setShowAdd(true)}
            className="mt-5 flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm min-h-[48px] transition-all hover:brightness-110 active:scale-[0.97]"
            style={{ background:"#C9A84C", color:"#09090b" }}>
            <Plus size={16}/> Adicionar primeira key
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(k => <KeyCard key={k.id} apiKey={k} onDelete={id => setKeys(p => p.filter(k => k.id !== id))}/>)}
          <button onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-white/20 active:border-white/25 text-white/40 hover:text-white/70 transition-all text-sm min-h-[56px]">
            <Plus size={16}/> Adicionar outra key
          </button>
        </div>
      )}

      {/* Provider guide (desktop only) */}
      <div className="hidden md:block mt-8 space-y-2">
        <p className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-3">Providers disponíveis</p>
        {Object.entries(PROVIDERS).map(([id, p]) => (
          <div key={id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5">
            <span className="text-lg">{p.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-xs text-white/35 truncate">{p.desc}</p>
            </div>
            {configuredProviders.has(id) ? (
              <CheckCircle size={14} className="text-green-400 flex-shrink-0"/>
            ) : (
              <a href={p.docsUrl} target="_blank" rel="noopener"
                className="text-xs text-white/25 hover:text-[#C9A84C] flex items-center gap-1 flex-shrink-0">
                Obter key <ExternalLink size={9}/>
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Add sheet/modal */}
      {showAdd && <AddKeySheet onSuccess={k => setKeys(p => [k, ...p])} onClose={() => setShowAdd(false)}/>}
    </div>
  );
}
