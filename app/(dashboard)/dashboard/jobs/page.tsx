"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Cpu, Plus, RefreshCw, CheckCircle, Clock, AlertCircle,
  Loader2, Image as ImageIcon, RotateCcw, ExternalLink,
} from "lucide-react";

interface Job {
  id: string;
  type: string;
  status: "queued" | "processing" | "done" | "failed";
  prompt: string;
  model: string;
  output_url?: string;
  credits_used?: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  metadata?: { model_name?: string; dimensions?: { width: number; height: number } };
}

const STATUS_CONFIG = {
  done:       { icon: <CheckCircle size={14}/>,                            color: "#4ADE80", label: "Concluído"   },
  processing: { icon: <Loader2 size={14} className="animate-spin"/>,       color: "#C9A84C", label: "Processando" },
  queued:     { icon: <Clock size={14}/>,                                  color: "#71717A", label: "Na fila"     },
  failed:     { icon: <AlertCircle size={14}/>,                            color: "#EF4444", label: "Falhou"      },
};

function JobCard({ job, onRetry }: { job: Job; onRetry: (jobId: string) => void }) {
  const [retrying, setRetrying] = useState(false);
  const s       = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.queued;
  const dims    = job.metadata?.dimensions;
  const modelName = job.metadata?.model_name ?? "";

  async function handleRetry() {
    setRetrying(true);
    try { await onRetry(job.id); }
    finally { setRetrying(false); }
  }

  return (
    <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.02] space-y-3">
      {/* Top */}
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 border border-white/10 flex items-center justify-center">
          {job.output_url
            ? <img src={job.output_url} alt="resultado" className="w-full h-full object-cover"/>
            : <ImageIcon size={20} className="text-white/20"/>
          }
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white/90 line-clamp-2 leading-snug">{job.prompt}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ color: s.color, background:`${s.color}18`, border:`1px solid ${s.color}25` }}>
              {s.icon} {s.label}
            </span>
            <span className="text-[11px] text-white/30 capitalize">{job.type.replace("image_","")}</span>
          </div>
        </div>
        {/* View asset link */}
        {job.status === "done" && job.output_url && (
          <a href={job.output_url} target="_blank" rel="noopener"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 hover:border-white/25 text-white/30 hover:text-white/60 transition-colors flex-shrink-0">
            <ExternalLink size={14}/>
          </a>
        )}
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-1 text-xs text-white/35">
        {modelName && <span className="truncate">{modelName.split(" ").slice(0,2).join(" ")}</span>}
        {dims && <span>{dims.width}×{dims.height}</span>}
        {job.credits_used != null && <span>{job.credits_used} cr</span>}
        <span>{new Date(job.created_at).toLocaleString("pt-BR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</span>
      </div>

      {/* Error message */}
      {job.status === "failed" && job.error_message && (
        <p className="text-xs text-red-400/70 leading-relaxed line-clamp-3 bg-red-500/5 border border-red-500/15 rounded-xl p-2.5">
          {job.error_message}
        </p>
      )}

      {/* Retry button — só para jobs failed */}
      {job.status === "failed" && (
        <button onClick={handleRetry} disabled={retrying}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 hover:border-[#C9A84C]/40 hover:bg-[#C9A84C]/5 text-sm font-semibold text-white/50 hover:text-[#C9A84C] transition-all min-h-[48px] disabled:opacity-50 active:scale-[0.98]">
          {retrying
            ? <><Loader2 size={15} className="animate-spin"/> Retentando...</>
            : <><RotateCcw size={15}/> Tentar novamente</>
          }
        </button>
      )}
    </div>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [retryError, setRetryError] = useState("");

  const fetchJobs = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/jobs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setJobs(data.jobs ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  async function handleRetry(jobId: string) {
    setRetryError("");
    try {
      const res  = await fetch("/api/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRetryError(data.error ?? "Erro ao retentar job");
        return;
      }
      // Sucesso — redireciona para assets ou recarrega lista
      if (data.asset_id) {
        router.push(`/dashboard/assets?new=${data.asset_id}`);
      } else {
        await fetchJobs();
      }
    } catch (e: any) {
      setRetryError(e.message);
    }
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Jobs</h1>
          <p className="text-sm text-white/40 mt-0.5">Histórico de geração</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchJobs} className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 hover:border-white/25 text-white/40 hover:text-white/70 transition-colors">
            <RefreshCw size={15}/>
          </button>
          <button
            onClick={() => router.push("/dashboard/jobs/new")}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm min-h-[48px] transition-all hover:brightness-110 active:scale-[0.97]"
            style={{ background:"#C9A84C", color:"#09090b" }}>
            <Plus size={16}/>
            <span className="hidden sm:inline">Novo Job</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/* Retry error banner */}
      {retryError && (
        <div className="flex items-center gap-2 text-red-400 text-sm p-4 rounded-xl border border-red-500/20 bg-red-500/5 mb-4">
          <AlertCircle size={14} className="flex-shrink-0"/>
          <span className="flex-1">{retryError}</span>
          <button onClick={() => setRetryError("")} className="text-white/30 hover:text-white/60 text-xs">✕</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-white/25 text-sm">
          <RefreshCw size={16} className="animate-spin"/> Carregando...
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-400 text-sm p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <AlertCircle size={14}/> {error}
          <button onClick={fetchJobs} className="ml-auto text-xs underline">Retry</button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Cpu size={28} className="text-white/20"/>
          </div>
          <p className="text-base font-semibold text-white/40">Nenhum job ainda</p>
          <p className="text-sm text-white/25 mt-1 max-w-xs">Gere sua primeira imagem com IA usando sua key fal.ai</p>
          <button onClick={() => router.push("/dashboard/jobs/new")}
            className="mt-5 flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm min-h-[48px] transition-all hover:brightness-110 active:scale-[0.97]"
            style={{ background:"#C9A84C", color:"#09090b" }}>
            <Plus size={16}/> Criar primeiro job
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(j => <JobCard key={j.id} job={j} onRetry={handleRetry}/>)}
        </div>
      )}
    </div>
  );
}
