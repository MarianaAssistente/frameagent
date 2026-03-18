/**
 * POST /api/locale — Persiste locale no cookie NEXT_LOCALE
 * Body: { locale: "pt" | "en" }
 */

import { NextRequest, NextResponse } from "next/server";

const VALID_LOCALES = ["pt", "en"] as const;
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(req: NextRequest) {
  const { locale } = await req.json();

  if (!VALID_LOCALES.includes(locale as any)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
  return res;
}
