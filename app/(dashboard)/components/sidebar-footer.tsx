"use client";

import { useState, useEffect, useRef } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { ProfileModal } from "./profile-modal";
import { LogOut, User } from "lucide-react";

interface UserData {
  credits?: number;
  plan?: string;
  display_name?: string;
  avatar_url?: string;
}

export function SidebarFooter({ myAccountLabel }: { myAccountLabel: string }) {
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((d) => setUserData(d))
      .catch(() => {});
  }, [modalOpen]);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // Resolve display name: custom > Clerk firstName > Clerk fullName > fallback
  const displayName = userData?.display_name
    || clerkUser?.firstName
    || clerkUser?.fullName
    || myAccountLabel;

  // Render avatar: emoji, photo, or initials
  function AvatarDisplay() {
    const av = userData?.avatar_url;
    if (av?.startsWith("emoji:")) {
      return (
        <div className="w-8 h-8 flex items-center justify-center text-xl bg-white/10 rounded-full border border-white/20 flex-shrink-0">
          {av.replace("emoji:", "")}
        </div>
      );
    }
    if (av && av.startsWith("data:")) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={av} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-white/20 flex-shrink-0" />;
    }
    // Clerk photo
    if (clerkUser?.imageUrl) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={clerkUser.imageUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-white/20 flex-shrink-0" />;
    }
    // Default initials
    return (
      <div className="w-8 h-8 flex items-center justify-center text-sm font-semibold bg-purple-600 rounded-full flex-shrink-0">
        {(displayName || "U").charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        {/* Popup menu */}
        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-xl z-50">
            <button
              onClick={() => { setMenuOpen(false); setModalOpen(true); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
              <User size={15} />
              Meu Perfil
            </button>
            <div className="h-px bg-white/10 mx-3" />
            <button
              onClick={() => signOut({ redirectUrl: "/" })}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={15} />
              Sair
            </button>
          </div>
        )}

        {/* Avatar row */}
        <div
          className="flex items-center gap-3 cursor-pointer group px-1 py-1 rounded-lg hover:bg-white/5 transition-colors"
          onClick={() => setMenuOpen((v) => !v)}
          title="Conta"
        >
          <AvatarDisplay />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-xs text-white/50 truncate group-hover:text-white/70 transition-colors">
              {displayName}
            </span>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className={`px-1.5 py-0.5 rounded font-medium ${userData?.plan === 'pro' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                {userData?.plan?.toUpperCase() ?? 'FREE'}
              </span>
              <span className="text-white/30">⚡ {userData?.credits ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      <ProfileModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialName={userData?.display_name}
        initialAvatar={userData?.avatar_url}
      />
    </>
  );
}
