"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, Image, Film, BookImage, User2, LayoutTemplate,
  Cpu, ChevronLeft, AlertCircle, Loader2, Sparkles, Info,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

const JOB_TYPES = [
  { id:"image",  label:"Imagem",   icon:<Image size={20}/>,         color:"#C9A84C", desc:"1:1 · 1024×1024" },
  { id:"post",   label:"Post",     icon:<BookImage size={20}/>,     color:"#9B7EC8", desc:"4:5 · 1080×1350" },
  { id:"reel",   label:"Reel",     icon:<Film size={20}/>,          color:"#06B6D4", desc:"9:16 · 1080×1920" },
  { id:"story",  label:"Story",    icon:<LayoutTemplate size={20}/>,color:"#F59E0B", desc:"9:16 · 1080×1920" },
  { id:"avatar", label:"Avatar",   icon:<User2 size={20}/>,         color:"#4ADE80", desc:"1:1 · 512×512"   },
] as const;

type JobType = typeof JOB_TYPES[number]["id"];

const MODELS = [
  { id:"flux-schnell", name:"FLUX.2 Schnell",  badge:"Rápido",    desc:"~3s por imagem. Ideal para testes e iteração.",            credits:5  },
  { id:"flux-dev",     name:"FLUX.2 Dev",      badge:"Equilibrado",desc:"Melhor qualidade que Schnell, um pouco mais lento.",       credits:5  },
  { id:"flux-pro",     name:"FLUX.2 Pro",      badge:"Alta qualidade",desc:"Máxima qualidade. Recomendado para entrega final.",     credits:8  },
  { id:"recraft-v3",   name:"Recraft V3",      badge:"Design",    desc:"Excelente para vetores, tipografia e design gráfico.",     credits:6  },
  { id:"ideogram-v2",  name:"Ideogram V2",     badge:"Texto",     desc:"Especializado em texto dentro de imagens.",                credits:6  },
] as const;

type ModelId = typeof MODELS[number]["id"];

const PROMPT_EXAMPLES: Record<JobType, string> = {
  image:  "Um pôr do sol dramático sobre o oceano, fotografia cinematográfica, cores vibrantes, estilo hiper-realista",
  post:   "Layout minimalista para post de Instagram sobre saúde mental, fundo bege, tipografia elegante, flores delicadas",
  reel:   "Intro de Reel dinâmica para marca de moda, fundo preto, letras douradas, animação de partículas",
  story:  "Story template para promoção de produto, gradiente roxo e dourado, espaço para texto centralizado",
  avatar: "Foto profissional de perfil, homem jovem, sorriso confiante, fundo desfocado, iluminação suave de estúdio",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewJobPage() {
  const router = useRouter();

  const [jobType,  setJobType]  = useState<JobType>("image");
  const [model,    setModel]    = useState<ModelId>("flux-schnell");
  const [prompt,   setPrompt]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [progress, setProgress] = useState<string | null>(null);

  const selectedModel   = MODELS.find(m => m.id === model)!;
  const selectedType    = JOB_TYPES.find(t => t.id === jobType)!;
  const promptTooLong   = prompt.length > 2000;
  const canSubmit       = prompt.trim().length >= 10 && !promptTooLong && !loading;

  async function handleGenerate() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    setProgress("Enviando para fal.ai...");

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), type: jobType, model }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "NO_FAL_KEY") {
          setError("Nenhuma API key fal.ai configurada. Adicione em API Keys.");
          setLoading(false);
          setProgress(null);
          return;
        }
        if (data.code === "NO_CREDITS") {
          setError("Créditos insuficientes.");
          setLoading(false);
          setProgress(null);
          return;
        }
        throw new Error(data.error ?? "Erro desconhecido");
      }

      // HTTP 202 — worker em processamento, fazer polling
      if (res.status === 202 && data.polling) {
        setProgress("Processando no worker... acompanhe em Jobs.");
        await new Promise(r => setTimeout(r, 2000));
        router.push("/dashboard/jobs");
        return;
      }

      setProgress("Imagem gerada! Redirecionando...");
      await new Promise(r => setTimeout(r, 600));
      const newParam = data.asset_id ? `?new=${data.asset_id}` : "";
      router.push(`/dashboard/assets${newParam}`);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
      setProgress(null);
    }
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      {/* Back nav */}
      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-5 min-h-[40px]">
        <ChevronLeft size={16}/> Voltar para Jobs
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <div className="w-12 h-12 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center">
          <Sparkles size={22} className="text-[#C9A84C]"/>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Novo Job</h1>
          <p className="text-sm text-white/40">Gere uma imagem com IA usando sua key fal.ai</p>
        </div>
      </div>

      <div className="space-y-6">

        {/* 1. Tipo de conteúdo */}
        <div>
          <label className="block text-sm font-semibold text-white/70 mb-3">
            Tipo de conteúdo
          </label>
          <div className="grid grid-cols-5 gap-2">
            {JOB_TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => setJobType(t.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all min-h-[72px] md:min-h-[80px] ${
                  jobType === t.id
                    ? "border-[#C9A84C]/50 bg-[#C9A84C]/10"
                    : "border-white/8 hover:border-white/20 active:bg-white/5"
                }`}>
                <span style={{ color: jobType === t.id ? t.color : "#ffffff60" }}>{t.icon}</span>
                <span className="text-xs font-medium">{t.label}</span>
                <span className="text-[10px] text-white/30 hidden md:block">{t.desc}</span>
              </button>
            ))}
          </div>
          {/* Dimensões selecionadas */}
          <p className="text-xs text-white/30 mt-2 flex items-center gap-1">
            <Info size={11}/> {selectedType.label}: {selectedType.desc}
          </p>
        </div>

        {/* 2. Modelo */}
        <div>
          <label className="block text-sm font-semibold text-white/70 mb-3">
            Modelo de geração
          </label>
          <div className="space-y-2">
            {MODELS.map(m => (
              <button key={m.id} type="button" onClick={() => setModel(m.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all min-h-[56px] ${
                  model === m.id
                    ? "border-[#C9A84C]/50 bg-[#C9A84C]/8"
                    : "border-white/8 hover:border-white/20 active:bg-white/5"
                }`}>
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${
                  model === m.id ? "border-[#C9A84C] bg-[#C9A84C]" : "border-white/25"
                }`}/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{m.name}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-white/8 text-white/50 font-medium">{m.badge}</span>
                    <span className="text-[11px] text-white/35 flex items-center gap-0.5 ml-auto flex-shrink-0">
                      <Zap size={10} className="text-[#C9A84C]/60"/> {m.credits} cr
                    </span>
                  </div>
                  <p className="text-xs text-white/35 mt-0.5 leading-relaxed">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Prompt */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-white/70">
              Prompt <span className="text-white/30 font-normal">(descreva a imagem)</span>
            </label>
            <span className={`text-xs ${promptTooLong ? "text-red-400" : "text-white/30"}`}>
              {prompt.length}/2000
            </span>
          </div>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={PROMPT_EXAMPLES[jobType]}
            rows={5}
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-[#C9A84C]/50 transition-colors resize-none leading-relaxed"
            style={{ fontSize:"16px" }}
          />
          {/* Exemplo */}
          <button type="button"
            onClick={() => setPrompt(PROMPT_EXAMPLES[jobType])}
            className="mt-2 text-xs text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors flex items-center gap-1">
            <Sparkles size={10}/> Usar exemplo para {selectedType.label}
          </button>
        </div>

        {/* Resumo do job */}
        <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.02] space-y-2">
          <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Resumo</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">Tipo</span>
            <span className="font-medium">{selectedType.label} · {selectedType.desc}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">Modelo</span>
            <span className="font-medium">{selectedModel.name}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">Custo</span>
            <span className="font-medium text-[#C9A84C]">
              {selectedModel.credits} créditos
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-red-500/20 bg-red-500/5">
            <div className="flex items-start gap-2 text-red-400 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5"/>
              <span className="leading-relaxed">{error}</span>
            </div>
            {error.includes("fal.ai") && (
              <a href="/dashboard/keys"
                className="text-sm text-[#C9A84C] underline font-medium">
                → Configurar API key fal.ai agora
              </a>
            )}
          </div>
        )}

        {/* Progress */}
        {progress && !error && (
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 text-sm text-[#C9A84C]">
            <Loader2 size={16} className="animate-spin flex-shrink-0"/>
            {progress}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-bold min-h-[56px] transition-all disabled:opacity-40 hover:brightness-110 active:scale-[0.98]"
          style={{ background: canSubmit ? "linear-gradient(135deg, #C9A84C, #E8D48B)" : "#C9A84C66", color: "#09090b" }}>
          {loading
            ? <><Loader2 size={18} className="animate-spin"/> Gerando...</>
            : <><Cpu size={18}/> Gerar com {selectedModel.name}</>
          }
        </button>

        <p className="text-xs text-white/25 text-center leading-relaxed">
          Usando sua API key fal.ai (BYOK) — você paga direto à fal.ai.<br/>
          {selectedModel.credits} créditos FrameAgent serão debitados.
        </p>
      </div>
    </div>
  );
}
