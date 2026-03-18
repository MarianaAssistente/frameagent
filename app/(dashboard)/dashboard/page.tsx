import { getTranslations } from "next-intl/server";
import { Zap, Cpu, FolderOpen, Key, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");

  const stats = [
    { label: t("stats.credits"), value: "50", icon: <Zap size={20}/>,       color: "#C9A84C", href: "/dashboard/settings" },
    { label: t("stats.jobs"),    value: "0",  icon: <Cpu size={20}/>,        color: "#9B7EC8", href: "/dashboard/jobs"     },
    { label: t("stats.assets"),  value: "0",  icon: <FolderOpen size={20}/>, color: "#06B6D4", href: "/dashboard/assets"   },
  ];

  const quickLinks = [
    { label: "BYOK Keys",  icon: <Key size={18}/>,        color: "#4ADE80", href: "/dashboard/keys",              desc: "Configurar API keys" },
    { label: "Novo Job",   icon: <Cpu size={18}/>,        color: "#9B7EC8", href: "/dashboard/jobs",              desc: "Gerar conteúdo IA"   },
    { label: "Assets",     icon: <FolderOpen size={18}/>, color: "#06B6D4", href: "/dashboard/assets",            desc: "Ver arquivos gerados"},
  ];

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto md:max-w-4xl">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">{t("welcome")}</h1>
        <p className="text-base text-white/40 mt-1">{t("subtitle")}</p>
      </div>

      {/* Stats — empilhados no mobile, grid no desktop */}
      <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-3 md:gap-4 md:mb-8">
        {stats.map(s => (
          <Link key={s.label} href={s.href}
            className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-white/[0.02] hover:border-white/15 active:scale-[0.98] transition-all md:flex-col md:items-start md:p-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:`${s.color}15`, border:`1px solid ${s.color}25`, color:s.color }}>
              {s.icon}
            </div>
            <div className="flex-1 md:mt-1">
              <p className="text-2xl font-bold md:text-3xl" style={{ color: s.color }}>{s.value}</p>
              <p className="text-sm text-white/40">{s.label}</p>
            </div>
            <ArrowRight size={16} className="text-white/20 md:hidden"/>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <p className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-3">Ações rápidas</p>
      <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-3 md:gap-3">
        {quickLinks.map(q => (
          <Link key={q.label} href={q.href}
            className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 hover:border-white/20 active:scale-[0.98] transition-all group min-h-[64px]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:`${q.color}15`, border:`1px solid ${q.color}25`, color:q.color }}>
              {q.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{q.label}</p>
              <p className="text-xs text-white/35 mt-0.5">{q.desc}</p>
            </div>
            <ArrowRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0"/>
          </Link>
        ))}
      </div>
    </div>
  );
}
