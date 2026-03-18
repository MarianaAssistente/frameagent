import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const locales = ["pt", "en"] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = "pt";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value as Locale | undefined;
  const locale: Locale = (cookieLocale && locales.includes(cookieLocale)) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
