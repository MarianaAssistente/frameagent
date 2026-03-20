"use client"
import { useState, useEffect } from "react"
import { Film, Loader2, Download, Wand2 } from "lucide-react"

const BROLL_STYLES = [
  { id: 'cinematic', label: '🎬 Cinemático' },
  { id: 'social',    label: '📱 Social Media' },
  { id: 'corporate', label: '💼 Corporativo' },
  { id: 'nature',    label: '🌿 Natureza' },
  { id: 'abstract',  label: '✨ Abstrato' },
  { id: 'product',   label: '🛍️ Produto' },
]

const ASPECT_RATIOS = [
  { id: '9:16', label: '9:16', desc: 'Reels/TikTok' },
  { id: '1:1',  label: '1:1',  desc: 'Feed' },
  { id: '16:9', label: '16:9', desc: 'YouTube' },
]

const DURATIONS = ['3', '5', '8']

const BROLL_PRESETS: Record<string, string[]> = {
  finances: [
    'gold coins falling on dark background, slow motion, luxury feel',
    'stock market charts going up, green and gold, cinematic',
    'business handshake in modern office, warm light',
    'credit cards and money, premium feel, shallow depth of field',
    'piggy bank with coins, saving concept, soft light',
  ],
  health: [
    'fresh vegetables and fruits, vibrant colors, top view',
    'person meditating at sunrise, peaceful, cinematic',
    'running shoes on track, motivational, slow motion',
    'doctor hands, care concept, clean white background',
  ],
  tech: [
    'holographic interface, futuristic, blue glow',
    'code on screen, developer environment, dark theme',
    'AI neural network visualization, purple and blue',
    'smartphone with notifications, social media concept',
  ],
  lifestyle: [
    'coffee cup on table, morning routine, warm bokeh',
    'person typing on laptop in cafe, lifestyle',
    'sunset over city skyline, inspiring, golden hour',
    'friends laughing together, happy, warm tones',
  ],
}

export default function VideoPage() {
  const [tab, setTab] = useState<'broll' | 'img2video'>('broll')
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [duration, setDuration] = useState('5')
  const [style, setStyle] = useState('cinematic')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{ url: string; job_id: string } | null>(null)
  const [error, setError] = useState('')

  // img2video states
  const [selectedImageUrl, setSelectedImageUrl] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [imageAssets, setImageAssets] = useState<Array<{ id: string; url: string; name: string }>>([])

  useEffect(() => {
    fetch('/api/assets?type=image')
      .then(r => r.json())
      .then(d => setImageAssets(Array.isArray(d) ? d.slice(0, 20) : []))
      .catch(() => {})
  }, [])

  async function handleGenerate() {
    if (!prompt.trim()) return
    if (tab === 'img2video' && !selectedImageUrl) return

    setProcessing(true)
    setError('')
    setResult(null)

    try {
      const body = tab === 'broll'
        ? { mode: 'text2video', prompt: `${prompt}, ${style} style`, aspect_ratio: aspectRatio, duration }
        : { mode: 'img2video', prompt, image_url: selectedImageUrl, asset_id: selectedAssetId, duration, aspect_ratio: aspectRatio }

      const res = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || 'Erro ao gerar vídeo')
      else setResult(data)
    } catch {
      setError('Erro de conexão')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Film size={24} className="text-[#C9A84C]" /> Gerador de Vídeo
        </h1>
        <p className="text-sm text-white/40 mt-1">Crie B-Rolls e anime imagens com IA</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl w-fit">
        {([['broll', '🎬 B-Roll (texto → vídeo)'], ['img2video', '🖼️ Imagem → Vídeo']] as const).map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setResult(null); setError('') }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-[#C9A84C] text-black' : 'text-white/50 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">

          {/* B-Roll: Preset topics */}
          {tab === 'broll' && (
            <div>
              <p className="text-xs text-white/40 mb-2">Sugestões por nicho:</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.keys(BROLL_PRESETS).map(niche => (
                  <button key={niche}
                    onClick={() => setPrompt(BROLL_PRESETS[niche][Math.floor(Math.random() * BROLL_PRESETS[niche].length)])}
                    className="px-2.5 py-1 rounded-lg text-xs bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/[0.08] transition-colors capitalize">
                    {niche}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Img2Video: Image picker */}
          {tab === 'img2video' && (
            <div>
              <p className="text-xs text-white/40 mb-2">Selecione uma imagem:</p>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {imageAssets.map(asset => (
                  <button key={asset.id}
                    onClick={() => { setSelectedImageUrl(asset.url); setSelectedAssetId(asset.id) }}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedAssetId === asset.id ? 'border-[#C9A84C]' : 'border-transparent hover:border-white/20'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                  </button>
                ))}
                {imageAssets.length === 0 && (
                  <p className="col-span-4 text-xs text-white/30 text-center py-4">
                    Nenhuma imagem.{' '}
                    <a href="/dashboard/assets" className="text-[#C9A84C] hover:underline">Fazer upload →</a>
                  </p>
                )}
              </div>
              {selectedImageUrl && (
                <p className="text-xs text-green-400 mt-1">✓ Imagem selecionada</p>
              )}
            </div>
          )}

          {/* Prompt */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">
              {tab === 'broll' ? 'Descreva a cena' : 'Movimento / animação desejada'}
            </label>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white resize-none outline-none focus:border-[#C9A84C] placeholder:text-white/20"
              rows={3}
              placeholder={tab === 'broll'
                ? 'Ex: moedas de ouro caindo, fundo escuro, slow motion...'
                : 'Ex: zoom suave, câmera girando devagar ao redor...'
              }
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
            />
          </div>

          {/* Style (B-Roll only) */}
          {tab === 'broll' && (
            <div>
              <label className="text-xs text-white/40 mb-2 block">Estilo</label>
              <div className="grid grid-cols-3 gap-2">
                {BROLL_STYLES.map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)}
                    className={`py-1.5 px-2 rounded-lg text-xs text-center transition-colors border ${style === s.id ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]' : 'border-white/[0.08] text-white/40 hover:border-white/20 hover:text-white/70'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Aspect ratio + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/40 mb-2 block">Formato</label>
              <div className="flex gap-2">
                {ASPECT_RATIOS.map(r => (
                  <button key={r.id} onClick={() => setAspectRatio(r.id)}
                    className={`flex-1 py-2 rounded-lg text-xs text-center transition-colors border ${aspectRatio === r.id ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]' : 'border-white/[0.08] text-white/40 hover:border-white/20'}`}>
                    <span className="font-medium block">{r.label}</span>
                    <span className="text-[10px] opacity-70">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-2 block">Duração</label>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => setDuration(d)}
                    className={`flex-1 py-2 rounded-lg text-xs text-center transition-colors border ${duration === d ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]' : 'border-white/[0.08] text-white/40 hover:border-white/20'}`}>
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={processing || !prompt.trim() || (tab === 'img2video' && !selectedImageUrl)}
            className="w-full py-3 rounded-xl text-sm font-bold bg-[#C9A84C] text-black hover:bg-[#d4b55a] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {processing
              ? <><Loader2 size={16} className="animate-spin" /> Gerando vídeo... (pode levar 30-60s)</>
              : <><Film size={16} /> Gerar Vídeo • {tab === 'broll' ? '20' : '25'} créditos</>
            }
          </button>

          {processing && (
            <p className="text-xs text-white/30 text-center">
              Geração de vídeo leva entre 30 segundos e 2 minutos ☕
            </p>
          )}
        </div>

        {/* Right: Result */}
        <div className="flex flex-col">
          <p className="text-xs text-white/40 mb-2">Resultado</p>

          {/* Container com aspect ratio correto baseado na seleção */}
          <div
            className="bg-white/[0.03] rounded-2xl border border-white/[0.08] overflow-hidden relative flex items-center justify-center"
            style={{
              aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '1:1' ? '1/1' : '16/9',
              maxHeight: aspectRatio === '9:16' ? '520px' : '320px',
              width: '100%',
            }}
          >
            {!result && !processing && (
              <div className="text-center text-white/20">
                <Film size={40} className="mx-auto mb-2" />
                <p className="text-sm">O vídeo gerado aparecerá aqui</p>
              </div>
            )}
            {processing && (
              <div className="text-center">
                <Loader2 size={32} className="animate-spin text-[#C9A84C] mx-auto mb-3" />
                <p className="text-sm text-white/50">Processando com IA...</p>
                <p className="text-xs text-white/30 mt-1">Aguarde 30-120 segundos</p>
              </div>
            )}
            {result && (
              <video
                src={result.url}
                controls
                autoPlay
                loop
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '1rem',
                }}
              />
            )}
          </div>

          {result && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(result.url)
                    const blob = await res.blob()
                    const blobUrl = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = blobUrl
                    a.download = `frameagent-video-${Date.now()}.mp4`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(blobUrl)
                  } catch { window.open(result.url, '_blank') }
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <Download size={15} /> Download
              </button>
              <button
                onClick={() => { setResult(null); setPrompt('') }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm bg-[#C9A84C]/20 text-[#C9A84C] hover:bg-[#C9A84C]/30 transition-colors"
              >
                <Wand2 size={15} /> Gerar outro
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
