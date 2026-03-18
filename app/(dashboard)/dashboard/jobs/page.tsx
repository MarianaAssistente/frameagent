import { getTranslations } from "next-intl/server";

export default async function JobsPage() {
  const t = await getTranslations("jobs");

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
      <p className="text-white/40 text-sm mb-8">{t("subtitle")}</p>
      <div className="text-center py-16 text-white/20">
        <p className="text-sm">{t("empty")}</p>
        <p className="text-xs mt-1">{t("emptyDesc")}</p>
      </div>
    </div>
  );
}
