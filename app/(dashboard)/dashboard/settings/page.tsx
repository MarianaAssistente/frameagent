import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Key, ChevronRight, Globe } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";

export default async function SettingsPage() {
  const t = await getTranslations("settings");

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">{t("title")}</h1>
      <p className="text-base text-white/40 mb-8">{t("subtitle")}</p>

      <div className="space-y-3">
        {/* Language */}
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-white/[0.02] min-h-[64px]">
          <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
            <Globe size={18} className="text-white/50"/>
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold">{t("language")}</p>
            <p className="text-sm text-white/35 mt-0.5">PT-BR · EN-US</p>
          </div>
          <LanguageToggle />
        </div>

        {/* API Keys */}
        <Link href="/dashboard/settings/api-keys"
          className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 hover:border-white/20 active:bg-white/5 transition-colors group min-h-[64px]">
          <div className="w-11 h-11 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
            <Key size={18} className="text-[#C9A84C]"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold">API Keys — BYOK</p>
            <p className="text-sm text-white/35 mt-0.5 truncate">Gerenciar chaves de API</p>
          </div>
          <ChevronRight size={18} className="text-white/25 group-hover:text-white/50 transition-colors flex-shrink-0"/>
        </Link>
      </div>
    </div>
  );
}
