import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { LayoutDashboard, Cpu, FolderOpen, Key, Settings, Zap } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getTranslations } from "next-intl/server";

const NAV_ITEMS = [
  { href:"/dashboard",                   icon:<LayoutDashboard size={16}/>, key:"dashboard"  },
  { href:"/dashboard/jobs",              icon:<Cpu size={16}/>,             key:"jobs"       },
  { href:"/dashboard/assets",            icon:<FolderOpen size={16}/>,      key:"assets"     },
  { href:"/dashboard/keys",              icon:<Key size={16}/>,             key:"apiKeys"    },
  { href:"/dashboard/settings/api-keys", icon:<Key size={16}/>,             key:"byokKeys"   },
  { href:"/dashboard/settings",          icon:<Settings size={16}/>,        key:"settings"   },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("nav");

  return (
    <div className="flex h-screen bg-[#09090b] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/8 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/8">
          <Zap size={18} style={{ color:"#C9A84C" }}/>
          <span className="font-bold text-sm">FrameAgent</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" style={{ scrollbarWidth:"thin", scrollbarColor:"rgba(201,168,76,0.2) transparent" }}>
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors">
              <span style={{ color:"inherit" }}>{item.icon}</span>
              {t(item.key as any)}
            </Link>
          ))}
        </nav>

        {/* Footer — User + Language */}
        <div className="p-4 border-t border-white/8 space-y-3">
          {/* Language toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/25 uppercase tracking-wider">Lang</span>
            <LanguageToggle />
          </div>
          {/* User */}
          <div className="flex items-center gap-3">
            <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }}/>
            <span className="text-xs text-white/40 truncate">{t("myAccount")}</span>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
