"use client"

import { useState, useEffect } from "react"
import { Wand2, Eraser, ZoomIn, Crop, Eye, Loader2, Image as ImageIcon, Brush } from "lucide-react"
import Link from "next/link"
import { MaskCanvas } from "../../components/mask-canvas"

const OPERATIONS = [
  {
    id: 'restyle',
    icon: <Wand2 size={18} />,
    labelPt: 'Reestilizar',
    description: 'Muda o estilo mantendo o sujeito',
    credits: 8,
    color: '#9B7EC8',
    needsPrompt: true,
    hasStrength: true,
    promptPlaceholder: 'Ex: anime, pintura a óleo, aquarela, cyberpunk...',
  },
  {
    id: 'inpaint',
    icon: <Eraser size={18} />,
    labelPt: 'Editar área',
    description: 'Substitui parte da imagem por prompt',
    credits: 8,
    color: '#C9A84C',
    needsPrompt: true,
    promptPlaceholder: 'Ex: substituir fundo por praia tropical...',
  },
  {
    id: 'remove-bg',
    icon: <Crop size={18} />,
    labelPt: 'Remover fundo',
    description: 'Remove o fundo automaticamente',
    credits: 3,
    color: '#4ADE80',
    needsPrompt: false,
    promptPlaceholder: '',
  },
  {
    id: 'upscale',
    icon: <ZoomIn size={18} />,
    labelPt: 'Aumentar resolução',
    description: 'Aumenta a resolução 4x com IA',
    credits: 5,
    color: '#06B6D4',
    needsPrompt: false,
    promptPlaceholder: '',
  },
  {
    id: 'describe',
    icon: <Eye size={18} />,
    labelPt: 'Descrever imagem',
    description: 'IA gera um prompt reverso da imagem',
    credits: 2,
    color: '#F59E0B',
    needsPrompt: false,
    promptPlaceholder: '',
  },
]

interface Asset {
  id: string
  name: string
  title?: string
  url: string
  type: string
}

export default function EditorPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [selectedOp, setSelectedOp] = useState(OPERATIONS[0])
  const [prompt, setPrompt] = useState('')
  const [strength, setStrength] = useState(0.45)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{ url: string } | null>(null)
  const [error, setError] = useState('')
  const [description, setDescription] = useState('')
  const [showMaskCanvas, setShowMaskCanvas] = useState(false)
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/assets?type=image')
      .then(r => r.json())
      .then(d => setAssets(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const baseUrl = params.get('base_url')
    const baseId = params.get('base_asset')
    if (baseUrl && baseId) {
      setSelectedAsset({ id: baseId, url: baseUrl, name: 'Imagem selecionada', type: 'image' })
    }
  }, [])

  async function handleEdit() {
    if (!selectedAsset) return
    setProcessing(true)
    setError('')
    setResult(null)
    setDescription('')

    try {
      let maskUrl: string | undefined
      if (selectedOp.id === 'inpaint' && maskDataUrl) {
        const blob = await fetch(maskDataUrl).then(r => r.blob())
        const formData = new FormData()
        formData.append('file', blob, 'mask.png')
        formData.append('title', 'inpaint-mask')
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()
        maskUrl = uploadData.url
      }

      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: selectedOp.id,
          asset_id: selectedAsset.id,
          image_url: selectedAsset.url,
          prompt,
          params: {
            ...(maskUrl ? { mask_url: maskUrl } : {}),
            ...(selectedOp.id === 'restyle' ? { strength } : {}),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao processar')
      } else if (data.description) {
        setDescription(data.description)
      } else {
        setResult({ url: data.url })
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Left: Image picker */}
      <div className="w-48 border-r border-white/8 flex flex-col p-3 gap-2 overflow-y-auto">
        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">Suas imagens</p>
        {assets.length === 0 && (
          <div className="text-center py-8">
            <ImageIcon size={20} className="text-white/20 mx-auto mb-2" />
            <p className="text-white/30 text-xs">Nenhuma imagem</p>
            <Link href="/dashboard/assets" className="text-[#C9A84C] text-xs hover:underline">Upload →</Link>
          </div>
        )}
        {assets.map(asset => (
          <button key={asset.id}
            onClick={() => { setSelectedAsset(asset); setResult(null); setDescription(''); setMaskDataUrl(null) }}
            className={`rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
              selectedAsset?.id === asset.id ? 'border-[#C9A84C]' : 'border-transparent hover:border-white/20'
            }`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.url} alt={asset.name} className="w-full aspect-square object-cover" />
          </button>
        ))}
      </div>

      {/* Center: Preview */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0a0a0a] relative">
        {!selectedAsset ? (
          <div className="flex flex-col items-center gap-3 text-white/20">
            <ImageIcon size={48} />
            <p className="text-sm">Selecione uma imagem para editar</p>
            <Link href="/dashboard/assets" className="text-[#C9A84C] text-sm hover:underline">
              Ir para a biblioteca →
            </Link>
          </div>
        ) : (
          <div className="relative max-w-2xl w-full">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/30 mb-2 text-center">Original</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedAsset.url} alt="original"
                  className="w-full rounded-xl border border-white/10 object-contain max-h-[60vh]" />
              </div>
              <div>
                <p className="text-xs text-white/30 mb-2 text-center">Resultado</p>
                <div className="w-full rounded-xl border border-white/10 bg-white/3 flex items-center justify-center min-h-[200px] max-h-[60vh] overflow-hidden">
                  {processing ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={24} className="animate-spin text-[#C9A84C]" />
                      <p className="text-xs text-white/40">Processando...</p>
                    </div>
                  ) : result ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={result.url} alt="resultado" className="w-full object-contain max-h-[60vh]" />
                  ) : description ? (
                    <div className="p-4">
                      <p className="text-xs text-white/50 mb-2">Descrição gerada:</p>
                      <p className="text-sm text-white/80 leading-relaxed">{description}</p>
                      <button onClick={() => setPrompt(description)}
                        className="mt-3 text-xs text-[#C9A84C] hover:underline">
                        Usar como prompt →
                      </button>
                    </div>
                  ) : (
                    <p className="text-white/20 text-xs">Resultado aparecerá aqui</p>
                  )}
                </div>
              </div>
            </div>

            {result && (
              <div className="flex justify-center mt-3 gap-3">
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(result.url)
                      const blob = await res.blob()
                      const ext = result.url.includes('.png') ? 'png' : 'jpg'
                      const blobUrl = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = blobUrl
                      a.download = `frameagent-edit-${Date.now()}.${ext}`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      URL.revokeObjectURL(blobUrl)
                    } catch {
                      window.open(result.url, '_blank')
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors">
                  ⬇️ Download
                </button>
                <button onClick={() => {
                  setSelectedAsset({ ...selectedAsset!, url: result.url })
                  setResult(null)
                }}
                  className="px-4 py-2 rounded-lg bg-[#C9A84C]/20 text-[#C9A84C] text-sm hover:bg-[#C9A84C]/30 transition-colors">
                  ✏️ Continuar editando
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Operations */}
      <div className="w-72 border-l border-white/8 flex flex-col p-4 gap-3 overflow-y-auto">
        <p className="text-[11px] text-white/30 uppercase tracking-wider">Operações</p>

        {OPERATIONS.map(op => (
          <button key={op.id}
            onClick={() => { setSelectedOp(op); setResult(null); setDescription(''); setMaskDataUrl(null) }}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedOp.id === op.id
                ? 'border-[#C9A84C]/50 bg-[#C9A84C]/10'
                : 'border-white/8 hover:border-white/20 bg-white/3'
            }`}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: op.color }}>{op.icon}</span>
              <span className="text-sm font-medium text-white">{op.labelPt}</span>
              <span className="ml-auto text-[10px] text-white/30">{op.credits} cr</span>
            </div>
            <p className="text-xs text-white/40">{op.description}</p>
          </button>
        ))}

        <div className="border-t border-white/8 pt-3 mt-1 space-y-3">
          {selectedOp.needsPrompt && (
            <div>
              <label className="text-xs text-white/40 mb-1 block">Prompt</label>
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white resize-none outline-none focus:border-[#C9A84C] placeholder:text-white/20"
                rows={3}
                placeholder={selectedOp.promptPlaceholder}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
            </div>
          )}

          {(selectedOp as { hasStrength?: boolean }).hasStrength && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-white/40">
                  Intensidade da transformação
                </label>
                <span className="text-xs font-medium text-[#C9A84C]">
                  {strength <= 0.35 ? 'Suave' : strength <= 0.55 ? 'Moderada' : strength <= 0.70 ? 'Forte' : 'Intensa'}
                </span>
              </div>
              <input
                type="range" min={0.2} max={0.85} step={0.05}
                value={strength}
                onChange={e => setStrength(Number(e.target.value))}
                className="w-full accent-[#C9A84C]"
              />
              <div className="flex justify-between text-[10px] text-white/20 mt-0.5">
                <span>Preserva sujeito</span>
                <span>Transforma tudo</span>
              </div>
            </div>
          )}

          {selectedOp.id === 'inpaint' && selectedAsset && (
            <div>
              <button onClick={() => setShowMaskCanvas(true)}
                className="w-full py-2 rounded-lg text-sm border border-dashed border-[#C9A84C]/40 text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-colors flex items-center justify-center gap-2">
                <Brush size={14} />
                {maskDataUrl ? '✓ Máscara definida — redesenhar' : 'Desenhar máscara (opcional)'}
              </button>
              {maskDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={maskDataUrl} alt="mask preview" className="mt-2 h-12 rounded border border-white/10 opacity-60" />
              )}
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2">{error}</p>
          )}

          <button
            onClick={handleEdit}
            disabled={!selectedAsset || processing}
            className="w-full py-3 rounded-xl text-sm font-medium bg-[#C9A84C] text-black hover:bg-[#d4b55a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {processing
              ? <><Loader2 size={15} className="animate-spin" /> Processando...</>
              : <><Wand2 size={15} /> Aplicar {selectedOp.labelPt} &bull; {selectedOp.credits} cr</>
            }
          </button>
        </div>
      </div>

      {/* Mask Canvas Modal */}
      {showMaskCanvas && selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-3xl w-full">
            <h3 className="text-white font-semibold mb-4">Desenhar área para editar</h3>
            <MaskCanvas
              imageUrl={selectedAsset.url}
              onMaskReady={(dataUrl) => {
                setMaskDataUrl(dataUrl)
                setShowMaskCanvas(false)
              }}
              onCancel={() => setShowMaskCanvas(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
