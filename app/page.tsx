"use client";

import Link from "next/link";
import { Zap, Shield, GitBranch, Users, ExternalLink } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

const PROVIDERS = [
  { name:"fal.ai",     icon:"🎬", color:"#9B7EC8", url:"https://fal.ai" },
  { name:"ElevenLabs", icon:"🎙️", color:"#F59E0B", url:"https://elevenlabs.io" },
  { name:"Hedra",      icon:"🎭", color:"#06B6D4", url:"https://hedra.com" },
  { name:"Gemini",     icon:"✨", color:"#4285F4", url:"https://ai.google.dev" },
  { name:"OpenAI",     icon:"🤖", color:"#4ADE80", url:"https://openai.com" },
  { name:"Creatomate", icon:"🎞️", color:"#C9A84C", url:"https://creatomate.com" },
];

const CREDIT_COSTS = [
  { action:"Geração de imagem / Image generation", credits:5  },
  { action:"Geração de vídeo curto / Short video", credits:20 },
  { action:"Avatar lip sync",                      credits:30 },
  { action:"Text-to-speech (por min / per min)",   credits:8  },
  { action:"Composição final / Final composition", credits:15 },
];

export default function LandingPage() {
  const t      = useTranslations("landing");
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-[#09090b] text-white">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={18} style={{ color:"#C9A84C" }}/>
            <span className="font-bold text-base">FrameAgent</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 ml-1">
              BETA
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <LanguageToggle />
            <SignInButton forceRedirectUrl="/dashboard" mode="redirect">
              <button className="text-sm text-white/60 hover:text-white transition-colors px-2 py-2 min-h-[40px]">
                {locale === "pt" ? "Entrar" : "Sign in"}
              </button>
            </SignInButton>
            <SignUpButton forceRedirectUrl="/dashboard" mode="redirect">
              <button className="text-sm px-4 py-2.5 rounded-xl font-semibold transition-all hover:brightness-110 min-h-[44px]"
                style={{ background:"#C9A84C", color:"#09090b" }}>
                {t("hero.ctaStart")}
              </button>
            </SignUpButton>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 md:pt-40 md:pb-24 md:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/5 text-[#C9A84C] text-sm font-medium mb-5 md:mb-6">
            <Zap size={12}/>
            {t("hero.badge")}
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-5 md:mb-6">
            {t("hero.title")}{" "}
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage:"linear-gradient(135deg, #C9A84C, #E8D48B, #C9A84C)" }}>
              {t("hero.titleHighlight")}
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed">
            {t("hero.description")}
          </p>
          {/* CTA buttons — full width on mobile */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 md:gap-4">
            <SignUpButton forceRedirectUrl="/dashboard" mode="redirect">
              <button className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold min-h-[56px] transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ background:"linear-gradient(135deg, #C9A84C, #E8D48B)", color:"#09090b" }}>
                {t("hero.ctaStart")}
              </button>
            </SignUpButton>
            <a href="#features"
              className="flex items-center justify-center w-full sm:w-auto px-8 py-4 rounded-2xl text-base border border-white/10 hover:border-white/25 transition-colors min-h-[56px]">
              {t("hero.ctaDemo")}
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-14 px-4 md:py-20 md:px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">{t("features.title")}</h2>
          {/* Mobile: 1 col → Desktop: 2 col */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            {[
              { icon:<Zap size={22}/>,       key:"byok",     color:"#C9A84C" },
              { icon:<GitBranch size={22}/>, key:"pipeline", color:"#9B7EC8" },
              { icon:<Shield size={22}/>,    key:"vault",    color:"#4ADE80" },
              { icon:<Users size={22}/>,     key:"scale",    color:"#06B6D4" },
            ].map(f => (
              <div key={f.key} className="flex items-start gap-4 p-5 rounded-2xl border border-white/8 bg-white/[0.02] md:flex-col md:p-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background:`${f.color}15`, border:`1px solid ${f.color}25`, color:f.color }}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold mb-1">{t(`features.${f.key}.title` as any)}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{t(`features.${f.key}.desc` as any)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Providers */}
      <section className="py-14 px-4 md:py-20 md:px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 md:mb-12">{t("providers.title")}</h2>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-3">
            {PROVIDERS.map(p => (
              <a key={p.name} href={p.url} target="_blank" rel="noopener"
                className="flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl border border-white/8 hover:border-white/20 active:bg-white/5 transition-colors group min-h-[80px] justify-center">
                <span className="text-2xl">{p.icon}</span>
                <span className="text-xs font-medium text-white/60">{p.name}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-14 px-4 md:py-20 md:px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2 md:mb-3">{t("pricing.title")}</h2>
          <p className="text-base text-white/40 text-center mb-8 md:mb-12">{t("pricing.subtitle")}</p>

          {/* Credit table */}
          <div className="space-y-2 mb-8 md:mb-10">
            {CREDIT_COSTS.map(c => (
              <div key={c.action} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-white/8">
                <span className="text-sm text-white/70 leading-tight">{c.action}</span>
                <span className="text-sm font-bold flex-shrink-0" style={{color:"#C9A84C"}}>
                  {c.credits} cr
                </span>
              </div>
            ))}
          </div>

          {/* Plans — stacked on mobile */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            {(["free","starter","pro"] as const).map((plan, i) => (
              <div key={plan} className={`p-5 rounded-2xl border ${i === 2 ? "border-[#C9A84C]/40 bg-[#C9A84C]/5" : "border-white/8"}`}>
                <div className="flex items-center justify-between mb-3 md:block">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">{t(`pricing.${plan}.name` as any)}</p>
                    <p className="text-2xl font-bold mt-0.5">
                      {plan === "free" ? t("pricing.free.credits") : t(`pricing.${plan}.price` as any)}
                      {plan !== "free" && <span className="text-sm font-normal text-white/40">{t(`pricing.${plan}.period` as any)}</span>}
                    </p>
                  </div>
                  {plan !== "free" && (
                    <p className="text-xs text-white/40 md:mb-3">{t(`pricing.${plan}.credits` as any)}</p>
                  )}
                </div>
                <SignUpButton forceRedirectUrl="/dashboard" mode="redirect">
                  <button className={`w-full text-center text-base font-semibold px-4 py-3 rounded-xl transition-all min-h-[48px] mt-2 md:mt-3 ${
                    i === 2
                      ? "bg-[#C9A84C] text-[#09090b] hover:brightness-110 active:scale-[0.97]"
                      : "border border-white/15 hover:border-white/30 active:bg-white/5"
                  }`}>
                    {t(`pricing.${plan}.cta` as any)}
                  </button>
                </SignUpButton>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 md:py-24 md:px-6 border-t border-white/5 text-center">
        <h2 className="text-3xl md:text-4xl font-black mb-4">{t("cta.title")}</h2>
        <p className="text-base md:text-lg text-white/40 mb-8 max-w-md mx-auto leading-relaxed">{t("cta.desc")}</p>
        <SignUpButton forceRedirectUrl="/dashboard" mode="redirect">
          <button className="w-full sm:w-auto inline-block px-10 py-4 rounded-2xl text-base font-bold min-h-[56px] transition-all hover:brightness-110 active:scale-[0.97]"
            style={{ background:"linear-gradient(135deg, #C9A84C, #E8D48B)", color:"#09090b" }}>
            {t("cta.button")}
          </button>
        </SignUpButton>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/5 text-center">
        <p className="text-white/20 text-sm">{t("footer.tagline")}</p>
      </footer>
    </div>
  );
}
