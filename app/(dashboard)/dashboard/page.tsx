import { auth } from "@clerk/nextjs/server";
import { Cpu, FolderOpen, Key, CreditCard, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const { userId } = await auth();

  const stats = [
    { label:"Jobs Rodados",   value:"0",  icon:<Cpu size={18}/>,       color:"#C9A84C", href:"/dashboard/jobs"   },
    { label:"Assets Salvos",  value:"0",  icon:<FolderOpen size={18}/>,color:"#06B6D4", href:"/dashboard/assets" },
    { label:"API Keys",       value:"0",  icon:<Key size={18}/>,        color:"#9B7EC8", href:"/dashboard/keys"   },
    { label:"Créditos",       value:"50", icon:<CreditCard size={18}/>, color:"#4ADE80", href:"/dashboard/settings"},
  ];

  const quickActions = [
    { icon:"🖼️", title:"Gerar Imagem",   desc:"FLUX, Imagen 4, DALL-E",  href:"/dashboard/jobs?type=image_generation",  color:"#C9A84C" },
    { icon:"🎬", title:"Gerar Vídeo",    desc:"Veo 3, Seedance, Kling",   href:"/dashboard/jobs?type=video_generation",  color:"#06B6D4" },
    { icon:"🎭", title:"Avatar Lip Sync",desc:"Hedra + ElevenLabs",        href:"/dashboard/jobs?type=avatar_lipsync",    color:"#9B7EC8" },
    { icon:"📱", title:"Compor Reel",    desc:"Pipeline 9:16 automático",  href:"/dashboard/jobs?type=reel_compose",      color:"#F59E0B" },
  ];

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Bem-vindo ao FrameAgent — seu studio de mídia com IA</p>
      </div>

      {/* MVP Notice */}
      <div className="flex items-start gap-3 p-4 mb-8 bg-[#C9A84C]/8 border border-[#C9A84C]/20 rounded-2xl">
        <span className="text-lg">🚧</span>
        <div>
          <p className="text-sm font-semibold text-[#C9A84C]">MVP em desenvolvimento — Dia 1 ✅</p>
          <p className="text-xs text-white/40 mt-0.5">
            Schema, auth e infra configurados. Próximo: integração fal.ai + queue BullMQ (Dia 2).
            Deadline: <strong className="text-white/60">01/04/2026</strong>
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <Link key={s.label} href={s.href}
            className="p-5 rounded-2xl border border-white/8 bg-white/[0.02] hover:border-white/15 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background:`${s.color}18`, color:s.color }}>
                {s.icon}
              </div>
              <span className="text-2xl font-bold" style={{ color:s.color }}>{s.value}</span>
            </div>
            <p className="text-xs text-white/40">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
          Criar Novo Job
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(a => (
            <Link key={a.title} href={a.href}
              className="p-4 rounded-xl border border-white/8 hover:border-white/20 transition-colors group">
              <span className="text-2xl block mb-3">{a.icon}</span>
              <p className="text-sm font-semibold mb-1">{a.title}</p>
              <p className="text-xs text-white/35">{a.desc}</p>
              <ArrowRight size={14} className="mt-3 text-white/20 group-hover:text-white/50 transition-colors"/>
            </Link>
          ))}
        </div>
      </div>

      {/* Setup BYOK prompt */}
      <div className="p-5 rounded-2xl border border-[#9B7EC8]/25 bg-[#9B7EC8]/5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-sm mb-1">⚙️ Configure suas API Keys (BYOK)</p>
            <p className="text-xs text-white/40">
              Adicione suas chaves de fal.ai, ElevenLabs, Hedra e Gemini para começar a criar.
              Seus créditos são usados apenas para a plataforma — os custos de API vão direto para sua conta.
            </p>
          </div>
          <Link href="/dashboard/keys"
            className="flex-shrink-0 px-4 py-2 rounded-lg text-xs font-semibold"
            style={{ background:"#9B7EC8", color:"white" }}>
            Adicionar keys
          </Link>
        </div>
      </div>
    </div>
  );
}
