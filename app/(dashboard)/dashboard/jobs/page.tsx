"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Cpu, Plus, RefreshCw, CheckCircle, Clock, AlertCircle, Loader2, Image } from "lucide-react";

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
  done:       { icon: <CheckCircle size={14}/>, color: "#4ADE80",  label: "Concluído"  },
  processing: { icon: <Loader2 size={14} className="animate-spin"/>, color: "#C9A84C", label: "Processando" },
  queued:     { icon: <Clock size={14}/>,       color: "#71717A",  label: "Na fila"    },
  failed:     { icon: <AlertCircle size={14}/>, color: "#EF4444",  label: "Falhou"     },
};

function JobCard({ job }: { job: Job }) {
  const s = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.queued;
  const modelName = job.metadata?.model_name ?? job.model ?? "—";
  const dims = job.metadata?.dimensions;

  return (
    <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.02] space-y-3">
      {/* Top row */}
      <div className="flex items-start gap-3">
        {/* Thumbnail or placeholder */}
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 border border-white/10 flex items-center justify-center">
          {job.output_url
            ? <img src={job.output_url} alt="resultado" className="w-full h-full object-cover"/>
            : <Image size={20} className="text-white/20"/>
          }
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white/90 line-clamp-2 leading-snug">{job.prompt}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Status badge */}
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ color: s.color, background: `${s.color}18`, border: `1px solid ${s.color}25` }}>
              {s.icon} {s.label}
            </span>
            {/* Type */}
            <span className="text-[11px] text-white/30 capitalize">{job.type.replace("image_","")}</span>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-2 text-xs text-white/35">
        <span>{modelName.split(" ").slice(0,2).join(" ")}</span>
        {dims && <span>{dims.width}×{dims.height}</span>}
        {job.credits_used && <span>{job.credits_used} créditos</span>}
        <span>{new Date(job.created_at).toLocaleDateString("pt-BR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</span>
      </div>

      {/* Error */}
      {job.status === "failed" && job.error_message && (
        <p className="text-xs text-red-400/80 leading-relaxed line-clamp-2">{job.error_message}</p>
      )}
    </div>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

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

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Jobs</h1>
          <p className="text-sm text-white/40 mt-0.5">Histórico de geração de conteúdo</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/jobs/new")}
          className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm flex-shrink-0 min-h-[48px] transition-all hover:brightness-110 active:scale-[0.97]"
          style={{ background:"#C9A84C", color:"#09090b" }}>
          <Plus size={16}/>
          <span className="hidden sm:inline">Novo Job</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

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
          <p className="text-sm text-white/25 mt-1 max-w-xs">
            Crie seu primeiro job e gere uma imagem com IA usando sua key fal.ai
          </p>
          <button onClick={() => router.push("/dashboard/jobs/new")}
            className="mt-5 flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm min-h-[48px] transition-all hover:brightness-110 active:scale-[0.97]"
            style={{ background:"#C9A84C", color:"#09090b" }}>
            <Plus size={16}/> Criar primeiro job
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(j => <JobCard key={j.id} job={j}/>)}
        </div>
      )}
    </div>
  );
}
