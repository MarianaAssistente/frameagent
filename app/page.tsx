import Link from "next/link";
import { Zap, Shield, GitBranch, Users, ExternalLink } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { LanguageToggle } from "@/components/LanguageToggle";

const PROVIDERS = [
  { name:"fal.ai",         icon:"🎬", color:"#9B7EC8", url:"https://fal.ai" },
  { name:"ElevenLabs",     icon:"🎙️", color:"#F59E0B", url:"https://elevenlabs.io" },
  { name:"Hedra",          icon:"🎭", color:"#06B6D4", url:"https://hedra.com" },
  { name:"Gemini",         icon:"✨", color:"#4285F4", url:"https://ai.google.dev" },
  { name:"OpenAI",         icon:"🤖", color:"#4ADE80", url:"https://openai.com" },
  { name:"Creatomate",     icon:"🎞️", color:"#C9A84C", url:"https://creatomate.com" },
];

const CREDIT_COSTS = [
  { action:"Geração de imagem / Image generation", credits:5  },
  { action:"Geração de vídeo curto / Short video", credits:20 },
  { action:"Avatar lip sync",                       credits:30 },
  { action:"Text-to-speech (por minuto / per min)", credits:8  },
  { action:"Composição final / Final composition",  credits:15 },
];

export default async function LandingPage() {
  const t     = await getTranslations("landing");
  const tc    = await getTranslations("common");
  const locale = await getLocale();

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={20} style={{ color:"#C9A84C" }}/>
            <span className="font-bold">FrameAgent</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 ml-1">
              BETA
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link href="/sign-in"
              className="text-sm text-white/60 hover:text-white transition-colors">
              {locale === "pt" ? "Entrar" : "Sign in"}
            </Link>
            <Link href="/sign-up"
              className="text-sm px-4 py-2 rounded-lg font-semibold transition-all hover:brightness-110"
              style={{ background:"#C9A84C", color:"#09090b" }}>
              {t("hero.ctaStart")}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/5 text-[#C9A84C] text-xs font-medium mb-6">
            <Zap size={11}/>
            {t("hero.badge")}
          </div>
          <h1 className="text-5xl sm:text-6xl font-black leading-tight mb-6">
            {t("hero.title")}{" "}
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage:"linear-gradient(135deg, #C9A84C, #E8D48B, #C9A84C)" }}>
              {t("hero.titleHighlight")}
            </span>
          </h1>
          <p className="text-xl text-white/50 max-w-2xl mx-auto mb-10">
            {t("hero.description")}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/sign-up"
              className="px-8 py-4 rounded-2xl text-base font-bold transition-all hover:brightness-110 hover:scale-105"
              style={{ background:"linear-gradient(135deg, #C9A84C, #E8D48B)", color:"#09090b" }}>
              {t("hero.ctaStart")}
            </Link>
            <Link href="#features"
              className="px-8 py-4 rounded-2xl text-base border border-white/10 hover:border-white/25 transition-colors">
              {t("hero.ctaDemo")}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">{t("features.title")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon:<Zap size={20}/>,       key:"byok",     color:"#C9A84C" },
              { icon:<GitBranch size={20}/>, key:"pipeline", color:"#9B7EC8" },
              { icon:<Shield size={20}/>,    key:"vault",    color:"#4ADE80" },
              { icon:<Users size={20}/>,     key:"scale",    color:"#06B6D4" },
            ].map(f => (
              <div key={f.key} className="p-6 rounded-2xl border border-white/8 bg-white/[0.02] hover:border-white/15 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background:`${f.color}15`, border:`1px solid ${f.color}25`, color:f.color }}>
                  {f.icon}
                </div>
                <h3 className="font-bold mb-2">{t(`features.${f.key}.title` as any)}</h3>
                <p className="text-sm text-white/40">{t(`features.${f.key}.desc` as any)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Providers */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">{t("providers.title")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {PROVIDERS.map(p => (
              <a key={p.name} href={p.url} target="_blank" rel="noopener"
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/8 hover:border-white/20 transition-colors group">
                <span className="text-2xl">{p.icon}</span>
                <span className="text-xs font-medium text-white/60 group-hover:text-white transition-colors">{p.name}</span>
                <ExternalLink size={10} className="text-white/20 group-hover:text-white/40 transition-colors"/>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Credit costs */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">{t("pricing.title")}</h2>
          <p className="text-white/40 text-center mb-12">{t("pricing.subtitle")}</p>
          <div className="space-y-2">
            {CREDIT_COSTS.map(c => (
              <div key={c.action} className="flex items-center justify-between p-4 rounded-xl border border-white/8">
                <span className="text-sm text-white/70">{c.action}</span>
                <span className="text-sm font-bold" style={{color:"#C9A84C"}}>
                  {c.credits} cr · {t("pricing.perJob")}
                </span>
              </div>
            ))}
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10">
            {(["free","starter","pro"] as const).map((plan, i) => (
              <div key={plan} className={`p-6 rounded-2xl border ${i === 2 ? "border-[#C9A84C]/40 bg-[#C9A84C]/5" : "border-white/8"}`}>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{t(`pricing.${plan}.name` as any)}</p>
                <p className="text-2xl font-bold mb-0.5">
                  {plan === "free" ? t("pricing.free.credits") : t(`pricing.${plan}.price` as any)}
                  {plan !== "free" && <span className="text-sm font-normal text-white/40">{t(`pricing.${plan}.period` as any)}</span>}
                </p>
                {plan !== "free" && <p className="text-xs text-white/40 mb-4">{t(`pricing.${plan}.credits` as any)}</p>}
                {plan === "free" && <p className="text-xs text-white/40 mb-4">{t("pricing.free.desc")}</p>}
                <Link href="/sign-up"
                  className={`block text-center text-sm font-semibold px-4 py-2.5 rounded-xl transition-all ${
                    i === 2
                      ? "bg-[#C9A84C] text-[#09090b] hover:brightness-110"
                      : "border border-white/15 hover:border-white/30"
                  }`}>
                  {t(`pricing.${plan}.cta` as any)}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/5 text-center">
        <h2 className="text-4xl font-black mb-4">{t("cta.title")}</h2>
        <p className="text-white/40 mb-8 max-w-md mx-auto">{t("cta.desc")}</p>
        <Link href="/sign-up"
          className="inline-block px-10 py-4 rounded-2xl text-base font-bold transition-all hover:brightness-110 hover:scale-105"
          style={{ background:"linear-gradient(135deg, #C9A84C, #E8D48B)", color:"#09090b" }}>
          {t("cta.button")}
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5 text-center">
        <p className="text-white/20 text-xs">{t("footer.tagline")}</p>
      </footer>
    </div>
  );
}
