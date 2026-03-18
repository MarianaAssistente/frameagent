"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";

/**
 * Language toggle — PT | EN
 * Persiste no cookie NEXT_LOCALE + localStorage, revalida via router.refresh()
 */
export function LanguageToggle() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  async function switchLocale(next: string) {
    if (next === locale) return;
    // Persist in cookie via API route
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    // Persist in localStorage too
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("frameagent_locale", next);
    }
    // Full page reload to get new server-side messages
    startTransition(() => { window.location.reload(); });
  }

  return (
    <div className={`flex items-center gap-0.5 text-xs font-semibold rounded-lg border border-white/10 overflow-hidden ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
      <button
        onClick={() => switchLocale("pt")}
        className={`px-2.5 py-1.5 transition-colors ${
          locale === "pt"
            ? "bg-[#C9A84C] text-[#09090b]"
            : "text-white/40 hover:text-white/70 hover:bg-white/5"
        }`}
        title="Português"
      >
        PT
      </button>
      <div className="w-px h-4 bg-white/10"/>
      <button
        onClick={() => switchLocale("en")}
        className={`px-2.5 py-1.5 transition-colors ${
          locale === "en"
            ? "bg-[#C9A84C] text-[#09090b]"
            : "text-white/40 hover:text-white/70 hover:bg-white/5"
        }`}
        title="English"
      >
        EN
      </button>
    </div>
  );
}
