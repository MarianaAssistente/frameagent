import { getTranslations } from "next-intl/server";
import { FolderOpen, Upload } from "lucide-react";

export default async function AssetsPage() {
  const t = await getTranslations("assets");

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("title")}</h1>
          <p className="text-base text-white/40 mt-1">{t("subtitle")}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm flex-shrink-0 min-h-[48px] border border-white/15 hover:border-white/30 transition-all active:scale-[0.97]">
          <Upload size={16}/>
          <span className="hidden sm:inline">Upload</span>
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <FolderOpen size={28} className="text-white/20"/>
        </div>
        <p className="text-base font-semibold text-white/40">{t("empty")}</p>
        <p className="text-sm text-white/25 mt-1 max-w-xs">{t("emptyDesc")}</p>
      </div>
    </div>
  );
}
