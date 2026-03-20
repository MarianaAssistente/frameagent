"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EMOJIS = ['😀','🤖','🦊','🐉','🎯','🔥','💎','🚀','🌟','🎨','👾','🎭','🌈','🦁','🐻','🐯','🎪','🌊','⚡','🏆'];

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  initialName?: string;
  initialAvatar?: string;
}

export function ProfileModal({ open, onClose, initialName, initialAvatar }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState(initialName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar ?? "");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"profile"|"avatar">("profile");

  // Sync props when modal opens
  useEffect(() => {
    if (open) {
      setDisplayName(initialName ?? "");
      setAvatarUrl(initialAvatar ?? "");
      setTab("profile");
    }
  }, [open, initialName, initialAvatar]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, avatar_url: avatarUrl }),
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#111] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Meu Perfil</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 mb-4">
          {(["profile","avatar"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-2 px-1 text-sm transition-colors ${tab === t ? "border-b-2 border-[#C9A84C] text-white" : "text-white/40 hover:text-white/60"}`}>
              {t === "profile" ? "Perfil" : "Avatar"}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Nome de exibição</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C9A84C]"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
          </div>
        )}

        {tab === "avatar" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/50 mb-2 block">Escolha um emoji</label>
              <div className="grid grid-cols-10 gap-1">
                {EMOJIS.map((emoji) => (
                  <button key={emoji} onClick={() => setAvatarUrl(`emoji:${emoji}`)}
                    className={`text-xl p-1 rounded hover:bg-white/10 transition-colors ${avatarUrl === `emoji:${emoji}` ? "bg-white/20 ring-1 ring-[#C9A84C]" : ""}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Ou envie uma foto</label>
              <input type="file" accept="image/*" onChange={handleFileChange}
                className="w-full text-sm text-white/60 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-white/10 file:text-white/70 file:text-xs hover:file:bg-white/20 cursor-pointer" />
            </div>
            {avatarUrl && !avatarUrl.startsWith("emoji:") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="preview" className="w-16 h-16 rounded-full object-cover border border-white/20" />
            )}
            {avatarUrl && avatarUrl.startsWith("emoji:") && (
              <div className="w-16 h-16 flex items-center justify-center text-4xl bg-white/5 rounded-full border border-white/20">
                {avatarUrl.replace("emoji:", "")}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg text-sm bg-[#C9A84C] text-black font-medium hover:bg-[#d4b55a] disabled:opacity-50 transition-colors">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
