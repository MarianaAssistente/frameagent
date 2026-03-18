import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { LayoutDashboard, Cpu, FolderOpen, Key, Settings, Zap } from "lucide-react";

const NAV = [
  { href:"/dashboard",                          icon:<LayoutDashboard size={16}/>, label:"Dashboard"  },
  { href:"/dashboard/jobs",                     icon:<Cpu size={16}/>,             label:"Jobs"       },
  { href:"/dashboard/assets",                   icon:<FolderOpen size={16}/>,      label:"Assets"     },
  { href:"/dashboard/keys",                     icon:<Key size={16}/>,             label:"API Keys"   },
  { href:"/dashboard/settings/api-keys",        icon:<Key size={16}/>,             label:"BYOK Keys"  },
  { href:"/dashboard/settings",                 icon:<Settings size={16}/>,        label:"Ajustes"    },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors">
              <span style={{ color:"inherit" }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/8 flex items-center gap-3">
          <UserButton appearance={{
            elements: { avatarBox: "w-8 h-8" }
          }}/>
          <span className="text-xs text-white/40 truncate">Minha conta</span>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
