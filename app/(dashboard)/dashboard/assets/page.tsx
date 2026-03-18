"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { FolderOpen, RefreshCw, AlertCircle, Download, Sparkles, Image as ImageIcon } from "lucide-react";

interface Asset {
  id: string;
  type: string;
  url: string;
  filename?: string;
  width?: number;
  height?: number;
  mime_type?: string;
  created_at: string;
  metadata?: { prompt?: string; model?: string };
}

function AssetCard({ asset, isNew }: { asset: Asset; isNew: boolean }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const prompt = asset.metadata?.prompt ?? "";

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      isNew ? "border-[#C9A84C]/50 ring-2 ring-[#C9A84C]/20" : "border-white/8"
    }`}>
      {/* Image */}
      <div className="relative bg-white/5 w-full" style={{ aspectRatio: asset.width && asset.height ? `${asset.width}/${asset.height}` : "1/1" }}>
        {isNew && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 rounded-lg bg-[#C9A84C] text-[#09090b] text-[11px] font-bold">
            <Sparkles size={10}/> Novo
          </div>
        )}
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon size={32} className="text-white/20"/>
          </div>
        )}
        <img
          src={asset.url}
          alt={prompt.slice(0, 80) || "asset"}
          className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setImgLoaded(true)}
        />
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        {prompt && (
          <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{prompt}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {asset.width && asset.height && (
              <span className="text-[11px] text-white/30">{asset.width}×{asset.height}</span>
            )}
            <span className="text-[11px] text-white/30">
              {new Date(asset.created_at).toLocaleDateString("pt-BR", { day:"2-digit", month:"short" })}
            </span>
          </div>
          <a href={asset.url} download target="_blank" rel="noopener"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 hover:border-white/25 hover:bg-white/5 active:bg-white/10 transition-colors text-white/40 hover:text-white/70"
            aria-label="Download">
            <Download size={14}/>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AssetsPage() {
  const searchParams = useSearchParams();
  const newAssetId = searchParams.get("new");

  const [assets, setAssets]   = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const fetchAssets = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/assets");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAssets(data.assets ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Assets</h1>
          <p className="text-sm text-white/40 mt-0.5">Imagens e vídeos gerados</p>
        </div>
        <button onClick={fetchAssets} className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 hover:border-white/25 text-white/40 hover:text-white/70 transition-colors">
          <RefreshCw size={16}/>
        </button>
      </div>

      {/* New asset banner */}
      {newAssetId && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl border border-[#C9A84C]/30 bg-[#C9A84C]/8">
          <Sparkles size={16} className="text-[#C9A84C]"/>
          <p className="text-sm font-semibold text-[#C9A84C]">Imagem gerada com sucesso! ✨</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-white/25 text-sm">
          <RefreshCw size={16} className="animate-spin"/> Carregando...
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-400 text-sm p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <AlertCircle size={14}/> {error}
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <FolderOpen size={28} className="text-white/20"/>
          </div>
          <p className="text-base font-semibold text-white/40">Nenhum asset ainda</p>
          <p className="text-sm text-white/25 mt-1 max-w-xs">
            Crie um job para gerar sua primeira imagem
          </p>
        </div>
      ) : (
        /* Grid: 1 col mobile → 2 col sm → 3 col md → 4 col lg */
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {assets.map(a => (
            <AssetCard key={a.id} asset={a} isNew={a.id === newAssetId}/>
          ))}
        </div>
      )}
    </div>
  );
}
