import Link from "next/link";
import { ArrowRight, Zap, Key, Film, Image, Radio, Layers } from "lucide-react";

export default function LandingPage() {
  const features = [
    { icon: <Image size={20}/>,  title: "Geração de Imagens",  desc: "FLUX, Imagen 4, DALL-E 3 — traga sua key, pague só pelo uso" },
    { icon: <Film size={20}/>,   title: "Geração de Vídeos",   desc: "Veo 3, Seedance, Kling — b-rolls e Reels 9:16 automáticos" },
    { icon: <Radio size={20}/>,  title: "Avatar Lip Sync",     desc: "Hedra + ElevenLabs — avatares falantes com voz clonada" },
    { icon: <Layers size={20}/>, title: "Pipeline Composável", desc: "Encadeie geradores, editores e renderers num único fluxo" },
    { icon: <Key size={20}/>,    title: "BYOK",                desc: "Traga suas próprias API keys. Sem markup, sem lock-in" },
    { icon: <Zap size={20}/>,    title: "API para Agentes",    desc: "Dispare jobs via API REST, receba webhooks, processe em escala" },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Nav */}
      <nav className="border-b border-white/8 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">⚡</span>
          <span className="text-lg font-bold">FrameAgent</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm text-white/60 hover:text-white transition-colors">
            Entrar
          </Link>
          <Link href="/sign-up"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background:"#C9A84C", color:"#09090b" }}>
            Começar grátis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
          MVP em desenvolvimento · v0.1 · deadline 01/04
        </div>

        <h1 className="text-5xl font-bold leading-tight mb-6">
          Criação de mídia com IA<br/>
          <span style={{ color:"#C9A84C" }}>para agentes de IA</span>
        </h1>

        <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10">
          Pipeline composável de imagem e vídeo. BYOK — traga suas próprias API keys.
          Geração, edição, lip sync e composição de Reels em um único fluxo automatizável.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
            style={{ background:"#C9A84C", color:"#09090b" }}>
            Acessar o dashboard <ArrowRight size={16}/>
          </Link>
          <Link href="https://github.com/MarianaAssistente/frameagent"
            target="_blank"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border border-white/10 hover:border-white/25 transition-colors">
            Ver no GitHub
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div key={i} className="p-6 rounded-2xl border border-white/8 bg-white/[0.02] hover:border-white/15 transition-colors">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background:"#C9A84C18", color:"#C9A84C" }}>
                {f.icon}
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-white/45">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans strip */}
      <section className="border-t border-white/8 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8">Planos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name:"Free",    price:"$0",    credits:"50 créditos/mês",   color:"#71717A" },
              { name:"Starter", price:"$29",   credits:"500 créditos/mês",  color:"#C9A84C" },
              { name:"Pro",     price:"$79",   credits:"2.000 créditos/mês",color:"#06B6D4" },
              { name:"Agency",  price:"$249",  credits:"10.000 créditos/mês",color:"#9B7EC8" },
            ].map(p => (
              <div key={p.name} className="p-5 rounded-2xl border bg-white/[0.02]"
                style={{ borderColor:`${p.color}30` }}>
                <p className="text-xs font-semibold mb-1" style={{ color:p.color }}>{p.name}</p>
                <p className="text-2xl font-bold">{p.price}<span className="text-xs text-white/30">/mês</span></p>
                <p className="text-xs text-white/40 mt-2">{p.credits}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-white/20">
        FrameAgent · Panteão Digital · STM Group · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
