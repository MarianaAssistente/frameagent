import { getTranslations } from "next-intl/server";
import { Cpu, Plus } from "lucide-react";

export default async function JobsPage() {
  const t = await getTranslations("jobs");

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("title")}</h1>
          <p className="text-base text-white/40 mt-1">{t("subtitle")}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm flex-shrink-0 min-h-[48px] transition-all hover:brightness-110 active:scale-[0.97]"
          style={{ background:"#C9A84C", color:"#09090b" }}>
          <Plus size={16}/>
          <span className="hidden sm:inline">Novo Job</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <Cpu size={28} className="text-white/20"/>
        </div>
        <p className="text-base font-semibold text-white/40">{t("empty")}</p>
        <p className="text-sm text-white/25 mt-1 max-w-xs">{t("emptyDesc")}</p>
        <button className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm min-h-[48px] transition-all hover:brightness-110 active:scale-[0.97]"
          style={{ background:"#C9A84C", color:"#09090b" }}>
          <Plus size={16}/> {t("empty")}
        </button>
      </div>
    </div>
  );
}
