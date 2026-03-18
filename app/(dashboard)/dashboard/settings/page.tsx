import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Key, ChevronRight } from "lucide-react";

export default async function SettingsPage() {
  const t  = await getTranslations("settings");
  const tk = await getTranslations("settings.apiKeys");

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
      <p className="text-white/40 text-sm mb-8">{t("subtitle")}</p>

      {/* Quick links */}
      <div className="space-y-2">
        <Link href="/dashboard/settings/api-keys"
          className="flex items-center gap-4 p-4 rounded-xl border border-white/8 hover:border-white/20 transition-colors group">
          <div className="w-9 h-9 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center">
            <Key size={16} className="text-[#C9A84C]"/>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{tk("title")}</p>
            <p className="text-xs text-white/35 mt-0.5">{tk("subtitle")}</p>
          </div>
          <ChevronRight size={14} className="text-white/25 group-hover:text-white/50 transition-colors"/>
        </Link>
      </div>
    </div>
  );
}
