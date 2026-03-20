import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Cpu, FolderOpen, Key, Settings, Wand2, Film, Clapperboard } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getTranslations } from "next-intl/server";
import { SidebarFooter } from "./components/sidebar-footer";
import { UserButton } from "@clerk/nextjs";

const NAV_ITEMS = [
  { href:"/dashboard",                   icon:<LayoutDashboard size={20}/>, key:"dashboard" },
  { href:"/dashboard/jobs",              icon:<Cpu size={20}/>,             key:"jobs"      },
  { href:"/dashboard/editor",            icon:<Wand2 size={20}/>,           key:"editor"    },
  { href:"/dashboard/video",             icon:<Film size={20}/>,            key:"video"     },
  { href:"/dashboard/studio",            icon:<Clapperboard size={20}/>,    key:"studio"    },
  { href:"/dashboard/assets",            icon:<FolderOpen size={20}/>,      key:"assets"    },
  { href:"/dashboard/keys",              icon:<Key size={20}/>,             key:"apiKeys"   },
  { href:"/dashboard/settings",          icon:<Settings size={20}/>,        key:"settings"  },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("nav");

  return (
    <div className="flex h-screen bg-[#09090b] overflow-hidden">

      {/* ── Desktop Sidebar (md+) ─────────────────────────── */}
      <aside className="hidden md:flex w-56 border-r border-white/8 flex-col flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center px-4 py-4 border-b border-white/8">
          <Image src="/logo.png" alt="FrameAgent" width={140} height={38} className="object-contain" />
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto"
          style={{ scrollbarWidth:"thin", scrollbarColor:"rgba(201,168,76,0.2) transparent" }}>
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors">
              <span>{item.icon}</span>
              {t(item.key as any)}
            </Link>
          ))}
          <Link href="/dashboard/settings/api-keys"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors">
            <Key size={20}/>
            {t("byokKeys")}
          </Link>
        </nav>

        {/* Footer — User + Language */}
        <div className="p-4 border-t border-white/8 space-y-3">
          <div className="flex justify-end">
            <LanguageToggle />
          </div>
          <SidebarFooter myAccountLabel={t("myAccount")} />
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/8 bg-[#09090b] flex-shrink-0">
          <Image src="/logo.png" alt="FrameAgent" width={110} height={30} className="object-contain" />
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }}/>
          </div>
        </header>

        {/* Page content — scrollable, extra bottom padding on mobile for nav bar */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ──────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D0D] border-t border-white/10 flex items-stretch safe-area-pb"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-white/40 hover:text-[#C9A84C] active:text-[#C9A84C] transition-colors">
            {item.icon}
            <span className="text-[10px] font-medium leading-none">{t(item.key as any)}</span>
          </Link>
        ))}
      </nav>

    </div>
  );
}
