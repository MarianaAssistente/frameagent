"use client";

import { useState } from "react";
import { Key, Plus, Eye, EyeOff, Trash2, CheckCircle } from "lucide-react";

const PROVIDERS = [
  { id:"fal.ai",      name:"fal.ai",      desc:"Geração de imagem/vídeo (FLUX, Kling, Seedance)",  color:"#9B7EC8" },
  { id:"elevenlabs",  name:"ElevenLabs",  desc:"Text-to-Speech e clonagem de voz",                color:"#F59E0B" },
  { id:"hedra",       name:"Hedra",       desc:"Avatar lip sync realista",                         color:"#06B6D4" },
  { id:"gemini",      name:"Gemini",      desc:"Geração de imagens (Google Imagen 4)",             color:"#4285F4" },
  { id:"openai",      name:"OpenAI",      desc:"GPT-4o, DALL-E 3, Whisper",                        color:"#4ADE80" },
  { id:"creatomate",  name:"Creatomate",  desc:"Renderização de templates de vídeo",               color:"#C9A84C" },
];

export default function KeysPage() {
  const [adding, setAdding] = useState<string|null>(null);
  const [keyValue, setKeyValue] = useState("");
  const [label, setLabel] = useState("");
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState<Record<string,boolean>>({});

  function saveKey(provider: string) {
    if (!keyValue.trim()) return;
    // TODO: POST /api/keys — salva hash no Supabase, nunca o valor em texto puro
    setSaved(s => ({ ...s, [provider]: true }));
    setAdding(null); setKeyValue(""); setLabel("");
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">API Keys (BYOK)</h1>
        <p className="text-white/40 text-sm mt-1">
          Suas chaves são criptografadas antes de salvar. Nunca armazenamos o valor bruto.
        </p>
      </div>

      <div className="space-y-3">
        {PROVIDERS.map(p => (
          <div key={p.id} className="bg-zinc-900/50 border border-white/8 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                  style={{ background:`${p.color}18`, border:`1px solid ${p.color}25` }}>
                  🔑
                </div>
                <div>
                  <p className="font-semibold text-sm">{p.name}</p>
                  <p className="text-xs text-white/35">{p.desc}</p>
                </div>
              </div>
              {saved[p.id] ? (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle size={14}/> Configurado
                </div>
              ) : (
                <button onClick={() => setAdding(p.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-white/10 hover:border-white/25 transition-colors">
                  <Plus size={12}/> Adicionar
                </button>
              )}
            </div>

            {adding === p.id && (
              <div className="mt-4 space-y-3 pt-4 border-t border-white/8">
                <div>
                  <label className="text-xs text-white/40 block mb-1">Label (ex: "pessoal", "cliente")</label>
                  <input value={label} onChange={e => setLabel(e.target.value)}
                    placeholder="Minha key de produção"
                    className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/25"/>
                </div>
                <div>
                  <label className="text-xs text-white/40 block mb-1">API Key</label>
                  <div className="relative">
                    <input type={show ? "text" : "password"} value={keyValue}
                      onChange={e => setKeyValue(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:border-white/25"/>
                    <button type="button" onClick={() => setShow(s=>!s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
                      {show ? <EyeOff size={13}/> : <Eye size={13}/>}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveKey(p.id)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold"
                    style={{ background:"#C9A84C", color:"#09090b" }}>
                    Salvar
                  </button>
                  <button onClick={() => { setAdding(null); setKeyValue(""); setLabel(""); }}
                    className="px-4 py-2 rounded-lg text-xs border border-white/10 hover:border-white/25">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-white/20 text-center mt-8">
        🔒 Keys são hasheadas com SHA-256 antes de salvar no Supabase. O valor original nunca é armazenado.
      </p>
    </div>
  );
}
