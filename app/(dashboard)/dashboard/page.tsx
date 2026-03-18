import { getTranslations } from "next-intl/server";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">{t("welcome")}</h1>
      <p className="text-white/40 text-sm">{t("subtitle")}</p>
    </div>
  );
}
