"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Key, Plus, Trash2, CheckCircle, AlertCircle,
  RefreshCw, Shield, ExternalLink, Clock, X,
  Eye, EyeOff, Wallet, TriangleAlert,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiKey {
  id: string;
  provider: string;
  label: string;
  key_preview: string;
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
}

interface BalanceState {
  status: "idle" | "loading" | "ok" | "error";
  label?: string;
  balance?: number;
  unit?: string;
  error?: string;
}

// ─── Provider config ─────────────────────────────────────────────────────────

const PROVIDERS: Record<string, {
  name: string; desc: string; docsUrl: string; icon: string; color: string;
  placeholder: string; balanceSupported: boolean; topupUrl?: string;
}> = {
  "fal.ai":     { name:"fal.ai",         icon:"🎬", color:"#9B7EC8", balanceSupported:true,  topupUrl:"https://fal.ai/dashboard/billing",         desc:"FLUX, Kling, Seedance",       docsUrl:"https://fal.ai/dashboard/keys",               placeholder:"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:xxxxxx" },
  "elevenlabs": { name:"ElevenLabs",      icon:"🎙️", color:"#F59E0B", balanceSupported:true,  topupUrl:"https://elevenlabs.io/app/subscription",   desc:"Text-to-Speech & voz",        docsUrl:"https://elevenlabs.io/app/settings/api-keys", placeholder:"sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"          },
  "openai":     { name:"OpenAI",          icon:"🤖", color:"#4ADE80", balanceSupported:true,  topupUrl:"https://platform.openai.com/settings/billing/overview", desc:"GPT-4o, DALL-E, Whisper", docsUrl:"https://platform.openai.com/api-keys",  placeholder:"sk-proj-xxxxxxxxxxxxxxxxxxxx"                  },
  "creatomate": { name:"Creatomate",      icon:"🎞️", color:"#C9A84C", balanceSupported:true,  topupUrl:"https://creatomate.com/dashboard",         desc:"Composição de vídeo 9:16",   docsUrl:"https://creatomate.com/dashboard/api",        placeholder:"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"           },
  "gemini":     { name:"Gemini",          icon:"✨", color:"#4285F4", balanceSupported:false,                                                        desc:"Imagen 4 (Google)",          docsUrl:"https://aistudio.google.com/app/apikey",      placeholder:"AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX"             },
  "hedra":      { name:"Hedra",           icon:"🎭", color:"#06B6D4", balanceSupported:false,                                                        desc:"Avatar lip sync",            docsUrl:"https://www.hedra.com/app/settings",          placeholder:"sk_hedra_xxxxxxxxxxxxxxxxx"                    },
};

// ─── Balance Badge ─────────────────────────────────────────────────────────────

function BalanceBadge({
  keyId, provider, autoFetch,
}: { keyId: string; provider: string; autoFetch: boolean }) {
  const [bal, setBal] = useState<BalanceState>({ status: "idle" });
  const cfg = PROVIDERS[provider];
  const fetched = useRef(false);

  const fetchBalance = useCallback(async () => {
    if (!cfg?.balanceSupported) {
      setBal({ status: "ok", label: "Saldo n/d" });
      return;
    }
    setBal({ status: "loading" });
    try {
      const res  = await fetch(`/api/keys/balance?keyId=${keyId}`);
      const data = await res.json();
      if (!res.ok || !data.available) {
        setBal({ status: "error", error: data.error ?? "Falha" });
      } else {
        setBal({ status: "ok", balance: data.balance, unit: data.unit, label: data.label });
      }
    } catch (e: any) {
      setBal({ status: "error", error: e.message });
    }
  }, [keyId, cfg]);

  useEffect(() => {
    if (autoFetch && !fetched.current) {
      fetched.current = true;
      fetchBalance();
    }
  }, [autoFetch, fetchBalance]);

  // Determinar cor do badge baseada no saldo
  const getBadgeStyle = () => {
    if (bal.status === "loading") return { color:"#71717A", bg:"#71717A18", border:"#71717A25" };
    if (bal.status === "error")   return { color:"#EF4444", bg:"#EF444418", border:"#EF444425" };
    if (!cfg?.balanceSupported)   return { color:"#71717A", bg:"#71717A18", border:"#71717A25" };
    if (bal.balance === undefined) return { color:"#71717A", bg:"#71717A18", border:"#71717A25" };

    // USD: verde > $2, amarelo $0.50–$2, vermelho < $0.50
    if (bal.unit === "USD") {
      if (bal.balance > 2)    return { color:"#4ADE80", bg:"#4ADE8018", border:"#4ADE8025" };
      if (bal.balance > 0.5)  return { color:"#F59E0B", bg:"#F59E0B18", border:"#F59E0B25" };
      return { color:"#EF4444", bg:"#EF444418", border:"#EF444425" };
    }
    // Characters (ElevenLabs): verde > 10k, amarelo 1k–10k, vermelho < 1k
    if (bal.unit === "characters") {
      if (bal.balance > 10000) return { color:"#4ADE80", bg:"#4ADE8018", border:"#4ADE8025" };
      if (bal.balance > 1000)  return { color:"#F59E0B", bg:"#F59E0B18", border:"#F59E0B25" };
      return { color:"#EF4444", bg:"#EF444418", border:"#EF444425" };
    }
    return { color:"#4ADE80", bg:"#4ADE8018", border:"#4ADE8025" };
  };

  const formatBalance = () => {
    if (bal.label) return bal.label;
    if (bal.balance === undefined) return "—";
    if (bal.unit === "USD") return `$${bal.balance.toFixed(2)}`;
    if (bal.unit === "characters") return `${(bal.balance / 1000).toFixed(1)}k chars`;
    if (bal.unit === "renders") return `${bal.balance} renders`;
    return String(bal.balance);
  };

  const style = getBadgeStyle();
  const isLow = bal.status === "ok" && bal.unit === "USD" && (bal.balance ?? 99) < 2;

  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border"
        style={{ color: style.color, background: style.bg, borderColor: style.border }}>
        {bal.status === "loading"
          ? <RefreshCw size={9} className="animate-spin"/>
          : <Wallet size={9}/>
        }
        {bal.status === "loading" ? "…" : bal.status === "error" ? "Erro" : formatBalance()}
      </span>

      {/* Low balance alert */}
      {isLow && cfg?.topupUrl && (
        <a href={cfg.topupUrl} target="_blank" rel="noopener"
          className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
          title="Saldo baixo — recarregar">
          <TriangleAlert size={11}/>
        </a>
      )}

      {/* Refresh button */}
      {cfg?.balanceSupported && bal.status !== "loading" && (
        <button onClick={fetchBalance}
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/8 text-white/20 hover:text-white/50 transition-colors"
          title="Atualizar saldo">
          <RefreshCw size={11}/>
        </button>
      )}
    </div>
  );
}

// ─── Low balance alert banner ─────────────────────────────────────────────────

function LowBalanceAlert({ keyId, provider, label }: { keyId: string; provider: string; label: string }) {
  const cfg = PROVIDERS[provider];
  if (!cfg?.topupUrl || !cfg.balanceSupported) return null;

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-500/25 bg-amber-500/8 text-sm mt-1">
      <TriangleAlert size={14} className="text-amber-400 flex-shrink-0"/>
      <span className="text-amber-300/80 text-xs">
        Saldo baixo em <strong>{label}</strong> — recarregue antes que os jobs falhem.
      </span>
      <a href={cfg.topupUrl} target="_blank" rel="noopener"
        className="ml-auto text-xs text-amber-400 hover:text-amber-300 font-semibold underline flex-shrink-0">
        Recarregar →
      </a>
    </div>
  );
}

// ─── Key Card ─────────────────────────────────────────────────────────────────

function KeyCard({ apiKey, onDelete }: { apiKey: ApiKey; onDelete: (id: string) => void }) {
  const [deleting, setDeleting]     = useState(false);
  const [balStatus, setBalStatus]   = useState<"idle"|"ok"|"error">("idle");
  const [balLow, setBalLow]         = useState(false);
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
    <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.02] space-y-2.5">
      {/* Main row */}
      <div className="flex items-center gap-3">
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
        </div>

        {/* Delete */}
        <button onClick={handleDelete} disabled={deleting}
          className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-red-500/10 active:bg-red-500/20 text-white/25 hover:text-red-400 transition-colors flex-shrink-0"
          aria-label="Remover">
          {deleting ? <RefreshCw size={16} className="animate-spin"/> : <Trash2 size={16}/>}
        </button>
      </div>

      {/* Balance row */}
      <div className="flex items-center justify-between gap-2 pl-0.5">
        <BalanceBadge keyId={apiKey.id} provider={apiKey.provider} autoFetch={true}/>
        {apiKey.last_used_at && (
          <span className="text-[11px] text-white/20 flex items-center gap-1">
            <Clock size={9}/> {new Date(apiKey.last_used_at).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>

      {/* Low balance warning (rendered based on balance state — BalanceBadge handles this internally) */}
    </div>
  );
}

// ─── Add Key Sheet ─────────────────────────────────────────────────────────────

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
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose}/>
      {/* Mobile: bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-[#111] border-t border-white/10 rounded-t-3xl md:hidden max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom:"env(safe-area-inset-bottom,16px)" }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20"/>
        </div>
        <div className="px-5 pb-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Nova API Key</h2>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5">
              <X size={18} className="text-white/50"/>
            </button>
          </div>
          <SheetForm provider={provider} setProvider={setProvider} label={label} setLabel={setLabel}
            apiKey={key} setApiKey={setKey} show={show} setShow={setShow}
            loading={loading} error={error} canSubmit={!!canSubmit} cfg={cfg} onSubmit={submit}/>
        </div>
      </div>
      {/* Desktop: modal */}
      <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center" onClick={onClose}>
        <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4 mx-4"
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Nova API Key</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">
              <X size={16} className="text-white/50"/>
            </button>
          </div>
          <SheetForm provider={provider} setProvider={setProvider} label={label} setLabel={setLabel}
            apiKey={key} setApiKey={setKey} show={show} setShow={setShow}
            loading={loading} error={error} canSubmit={!!canSubmit} cfg={cfg} onSubmit={submit}/>
        </div>
      </div>
    </>
  );
}

function SheetForm({ provider, setProvider, label, setLabel, apiKey, setApiKey, show, setShow,
  loading, error, canSubmit, cfg, onSubmit }: any) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-white/60 mb-2">Provedor</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(PROVIDERS).map(([id, p]: any) => (
            <button key={id} type="button" onClick={() => setProvider(id)}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all min-h-[52px] ${
                provider === id ? "border-[#C9A84C]/50 bg-[#C9A84C]/10" : "border-white/8 hover:border-white/20"
              }`}>
              <span className="text-xl">{p.icon}</span>
              <span className="text-sm font-medium">{p.name}</span>
            </button>
          ))}
        </div>
        {cfg && (
          <p className="text-xs text-white/35 mt-2">
            {cfg.desc} · <a href={cfg.docsUrl} target="_blank" rel="noopener" className="text-[#C9A84C]/80 underline">Obter key</a>
          </p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-white/60 mb-2">Label</label>
        <input value={label} onChange={(e: any) => setLabel(e.target.value)} placeholder="ex: produção"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
          style={{ fontSize:"16px" }}/>
      </div>
      <div>
        <label className="block text-sm font-medium text-white/60 mb-2">
          API Key <span className="text-white/30 font-normal">— AES-256-GCM</span>
        </label>
        <div className="relative">
          <input type={show ? "text" : "password"} value={apiKey} onChange={(e: any) => setApiKey(e.target.value)}
            placeholder={cfg?.placeholder ?? "sk-..."}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-12 text-base font-mono focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
            style={{ fontSize:"16px" }}/>
          <button type="button" onClick={() => setShow((s: boolean) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/30 hover:text-white/60">
            {show ? <EyeOff size={18}/> : <Eye size={18}/>}
          </button>
        </div>
        <p className="text-xs text-white/30 mt-1.5 flex items-center gap-1">
          <Shield size={10} className="text-green-400/70"/> Valor original nunca armazenado
        </p>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm p-3 rounded-xl bg-red-500/5 border border-red-500/20">
          <AlertCircle size={14}/> {error}
        </div>
      )}
      <button type="submit" disabled={loading || !canSubmit}
        className="w-full py-4 rounded-xl text-base font-bold min-h-[56px] transition-all disabled:opacity-40"
        style={{ background:"#C9A84C", color:"#09090b" }}>
        {loading ? "Salvando..." : "Salvar API Key"}
      </button>
    </form>
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
          <p className="text-base text-white/40">BYOK — sem markup. Saldo consultado em tempo real.</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm flex-shrink-0 min-h-[48px] hover:brightness-110 active:scale-[0.97] transition-all"
          style={{ background:"#C9A84C", color:"#09090b" }}>
          <Plus size={16}/>
          <span className="hidden sm:inline">Adicionar</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-6 md:gap-3">
        {[
          { label:"Configuradas", value:`${configuredProviders.size}/${totalProviders}`, color:"#C9A84C" },
          { label:"Ativas",       value:keys.filter(k=>k.is_active).length,              color:"#4ADE80" },
          { label:"Providers",    value:totalProviders,                                  color:"#71717A" },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl border border-white/8 bg-white/[0.02] text-center">
            <p className="text-xl font-bold" style={{color:s.color}}>{s.value}</p>
            <p className="text-[11px] text-white/30 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Vault banner */}
      <div className="flex items-start gap-3 p-4 mb-6 bg-green-500/5 border border-green-500/20 rounded-2xl">
        <Shield size={16} className="text-green-400 flex-shrink-0 mt-0.5"/>
        <p className="text-sm text-white/50">
          <span className="text-green-400 font-semibold">Vault AES-256-GCM</span> — keys criptografadas.
          Consultas de saldo feitas server-side. Valor original nunca exposto ao cliente.
        </p>
      </div>

      {/* Keys list */}
      {loading ? (
        /* Skeleton */
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/5"/>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/5 rounded-lg w-2/3"/>
                  <div className="h-3 bg-white/5 rounded-lg w-1/3"/>
                </div>
              </div>
              <div className="mt-3 h-6 bg-white/5 rounded-lg w-24"/>
            </div>
          ))}
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
          <p className="text-sm text-white/25 mt-1 max-w-xs">Adicione suas keys para começar</p>
          <button onClick={() => setShowAdd(true)}
            className="mt-5 flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm min-h-[48px] hover:brightness-110 active:scale-[0.97] transition-all"
            style={{ background:"#C9A84C", color:"#09090b" }}>
            <Plus size={16}/> Adicionar primeira key
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(k => <KeyCard key={k.id} apiKey={k} onDelete={id => setKeys(p => p.filter(k => k.id !== id))}/>)}
          <button onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-white/20 text-white/40 hover:text-white/70 transition-all text-sm min-h-[56px]">
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
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{p.name}</p>
                {!p.balanceSupported && (
                  <span className="text-[10px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded">Saldo n/d</span>
                )}
              </div>
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

      {showAdd && <AddKeySheet onSuccess={k => setKeys(p => [k, ...p])} onClose={() => setShowAdd(false)}/>}
    </div>
  );
}
