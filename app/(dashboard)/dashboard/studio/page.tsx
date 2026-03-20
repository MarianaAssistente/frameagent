"use client"
import { useState, useCallback } from "react"
import { Mic, Film, Loader2, CheckCircle, Download, Wand2, Play, RotateCcw } from "lucide-react"

type Segment = {
  index: number
  start: number
  end: number
  narration: string
  broll_prompt: string
  broll_duration: number
  broll_url?: string
  generating?: boolean
  generated?: boolean
}

type AnalysisResult = {
  transcript: string
  duration_estimate: number
  segments: Segment[]
  aspect_ratio: string
  media_url: string
}

const STEPS = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Roteiro' },
  { id: 3, label: 'Vídeo Final' },
]

export default function StudioPage() {
  const [step, setStep] = useState(1)
  const [mediaUrl, setMediaUrl] = useState('')
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [style, setStyle] = useState('cinematic')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [generatingAll, setGeneratingAll] = useState(false)
  const [composing, setComposing] = useState(false)
  const [finalUrl, setFinalUrl] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      // FIX: rota correta é /api/upload (não /api/assets/upload que não existe)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      let data: { error?: string; url?: string }
      try {
        data = await res.json()
      } catch {
        throw new Error(`Erro no servidor (${res.status}): resposta inválida`)
      }
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setMediaUrl(data.url || '')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally { setUploading(false) }
  }, [])

  async function handleAnalyze() {
    if (!mediaUrl) return
    setAnalyzing(true)
    setError('')
    try {
      const res = await fetch('/api/analyze-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_url: mediaUrl, aspect_ratio: aspectRatio, style }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Análise falhou')
      setAnalysis(data)
      setSegments(data.segments.map((s: Segment) => ({ ...s, broll_url: '', generating: false, generated: false })))
      setStep(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro na análise')
    } finally { setAnalyzing(false) }
  }

  async function generateBroll(idx: number) {
    const seg = segments[idx]
    setSegments(prev => prev.map((s, i) => i === idx ? { ...s, generating: true } : s))
    try {
      const res = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'text2video',
          prompt: seg.broll_prompt,
          aspect_ratio: aspectRatio,
          duration: String(Math.min(Math.max(Math.round(seg.broll_duration), 3), 8)),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falhou')
      setSegments(prev => prev.map((s, i) => i === idx ? { ...s, broll_url: data.url, generating: false, generated: true } : s))
    } catch {
      setSegments(prev => prev.map((s, i) => i === idx ? { ...s, generating: false } : s))
    }
  }

  async function generateAllBrolls() {
    setGeneratingAll(true)
    for (let i = 0; i < segments.length; i++) {
      if (!segments[i].generated) await generateBroll(i)
    }
    setGeneratingAll(false)
  }

  async function handleCompose() {
    const readySegments = segments.filter(s => s.broll_url)
    if (readySegments.length === 0) return
    setComposing(true)
    setError('')
    try {
      const res = await fetch('/api/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_url: mediaUrl,
          segments: readySegments,
          aspect_ratio: aspectRatio,
          title: `Studio Video ${new Date().toLocaleDateString('pt-BR')}`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Montagem falhou')
      setFinalUrl(data.url)
      setStep(3)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro na montagem')
    } finally { setComposing(false) }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Wand2 size={24} className="text-[#C9A84C]" /> Studio — AI Video Director
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Envie sua narração. A IA gera os B-rolls e monta o vídeo completo.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
              ${step > s.id ? 'bg-green-500 text-white' : step === s.id ? 'bg-[#C9A84C] text-black' : 'bg-white/10 text-white/30'}`}>
              {step > s.id ? <CheckCircle size={16} /> : s.id}
            </div>
            <span className={`text-sm ${step === s.id ? 'text-white font-medium' : 'text-white/30'}`}>{s.label}</span>
            {i < STEPS.length - 1 && <div className={`w-8 h-px ${step > s.id ? 'bg-green-500' : 'bg-white/10'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f) }}
              className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-[#C9A84C]/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById('media-input')?.click()}
            >
              <input
                id="media-input" type="file" className="hidden"
                accept="audio/*,video/*"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
              />
              {uploading ? (
                <><Loader2 size={32} className="animate-spin text-[#C9A84C] mx-auto mb-2" /><p className="text-sm text-white/50">Fazendo upload...</p></>
              ) : mediaUrl ? (
                <><CheckCircle size={32} className="text-green-400 mx-auto mb-2" /><p className="text-sm text-green-400">Arquivo carregado ✓</p><p className="text-xs text-white/30 mt-1">Clique para trocar</p></>
              ) : (
                <>
                  <Mic size={32} className="text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-white/50">Arraste ou clique para enviar</p>
                  <p className="text-xs text-white/30 mt-1">Áudio (MP3, WAV, OGG) ou Vídeo (MP4)</p>
                </>
              )}
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1 block">Ou cole uma URL de áudio/vídeo</label>
              <input
                type="url"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#C9A84C] placeholder:text-white/20"
                placeholder="https://..."
                value={mediaUrl}
                onChange={e => setMediaUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-white/40 mb-2 block">Formato do vídeo final</label>
              <div className="flex gap-2">
                {[['9:16','Reels/TikTok'],['1:1','Feed'],['16:9','YouTube']].map(([r, d]) => (
                  <button key={r} onClick={() => setAspectRatio(r)}
                    className={`flex-1 py-2 rounded-lg text-xs text-center transition-colors border ${aspectRatio === r ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]' : 'border-white/10 text-white/40 hover:border-white/20'}`}>
                    <span className="font-medium block">{r}</span>
                    <span className="text-[10px] opacity-70">{d}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-white/40 mb-2 block">Estilo dos B-rolls</label>
              <div className="grid grid-cols-3 gap-2">
                {[['cinematic','🎬 Cinemático'],['corporate','💼 Corporativo'],['social','📱 Social']].map(([id, label]) => (
                  <button key={id} onClick={() => setStyle(id)}
                    className={`py-2 rounded-lg text-xs text-center border transition-colors ${style === id ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]' : 'border-white/10 text-white/40 hover:border-white/20'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}

            <button
              onClick={handleAnalyze}
              disabled={!mediaUrl || analyzing}
              className="w-full py-3 rounded-xl text-sm font-bold bg-[#C9A84C] text-black hover:bg-[#d4b55a] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {analyzing
                ? <><Loader2 size={16} className="animate-spin" /> Analisando narração...</>
                : <><Wand2 size={16} /> Analisar e gerar roteiro • 5 créditos</>
              }
            </button>
          </div>

          <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-6 space-y-4">
            <h3 className="text-sm font-medium text-white">Como funciona</h3>
            {[
              ['1', 'Upload da narração', 'Envie o áudio ou vídeo com a narração gravada'],
              ['2', 'IA analisa e cria roteiro', 'Gemini transcreve e sugere B-rolls para cada trecho'],
              ['3', 'B-rolls gerados', 'Cada clipe é gerado automaticamente pela IA'],
              ['4', 'Montagem automática', 'Narração + B-rolls montados pelo Creatomate'],
            ].map(([n, title, desc]) => (
              <div key={n} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#C9A84C]/20 text-[#C9A84C] text-xs flex items-center justify-center flex-shrink-0 font-bold">{n}</div>
                <div>
                  <p className="text-sm text-white/70 font-medium">{title}</p>
                  <p className="text-xs text-white/30">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && analysis && (
        <div className="space-y-4">
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.08] p-4">
            <p className="text-xs text-white/40 mb-1">Transcrição</p>
            <p className="text-sm text-white/70 leading-relaxed">{analysis.transcript}</p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-white/50">{segments.length} segmentos identificados</p>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)}
                className="px-4 py-2 rounded-lg text-xs bg-white/5 text-white/50 hover:bg-white/10 flex items-center gap-1">
                <RotateCcw size={12} /> Novo upload
              </button>
              <button
                onClick={generateAllBrolls}
                disabled={generatingAll}
                className="px-4 py-2 rounded-lg text-xs bg-[#C9A84C]/20 text-[#C9A84C] hover:bg-[#C9A84C]/30 flex items-center gap-1 disabled:opacity-50"
              >
                {generatingAll ? <><Loader2 size={12} className="animate-spin" /> Gerando...</> : <><Film size={12} /> Gerar todos os B-rolls</>}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {segments.map((seg, idx) => (
              <div key={idx} className="bg-white/[0.03] rounded-xl border border-white/[0.08] p-4">
                <div className="flex items-start gap-4">
                  <div className="w-20 flex-shrink-0"
                    style={{ aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '1:1' ? '1/1' : '16/9' }}>
                    {seg.broll_url ? (
                      <video src={seg.broll_url} autoPlay loop muted className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <div className="w-full h-full bg-white/5 rounded-lg flex items-center justify-center">
                        {seg.generating
                          ? <Loader2 size={16} className="animate-spin text-[#C9A84C]" />
                          : <Film size={16} className="text-white/20" />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-white/30 font-mono">{seg.start}s – {seg.end}s</span>
                      {seg.generated && <span className="text-xs text-green-400">✓ Gerado</span>}
                    </div>
                    <p className="text-sm text-white/70 mb-2 leading-snug">&ldquo;{seg.narration}&rdquo;</p>
                    <p className="text-xs text-white/30 leading-snug italic truncate">{seg.broll_prompt}</p>
                  </div>
                  <button
                    onClick={() => generateBroll(idx)}
                    disabled={seg.generating}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                      ${seg.generated ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-[#C9A84C]/20 text-[#C9A84C] hover:bg-[#C9A84C]/30'}
                      disabled:opacity-50`}
                  >
                    {seg.generating ? <Loader2 size={12} className="animate-spin" /> : seg.generated ? '↻' : <Play size={12} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}

          <button
            onClick={handleCompose}
            disabled={composing || segments.filter(s => s.broll_url).length === 0}
            className="w-full py-3 rounded-xl text-sm font-bold bg-[#C9A84C] text-black hover:bg-[#d4b55a] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {composing
              ? <><Loader2 size={16} className="animate-spin" /> Montando vídeo final...</>
              : <><Film size={16} /> Montar vídeo final • {segments.filter(s => s.broll_url).length} clipes prontos • 10 créditos</>
            }
          </button>
          {composing && <p className="text-xs text-white/30 text-center">A montagem leva 1-3 minutos ☕</p>}
        </div>
      )}

      {step === 3 && finalUrl && (
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <CheckCircle size={40} className="text-green-400 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-white">Vídeo montado!</h2>
            <p className="text-sm text-white/40 mt-1">Narração + B-rolls montados automaticamente pela IA</p>
          </div>
          <div className="w-full max-w-sm"
            style={{ aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '1:1' ? '1/1' : '16/9' }}>
            <video src={finalUrl} controls autoPlay loop className="w-full h-full object-cover rounded-2xl" />
          </div>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                try {
                  const r = await fetch(finalUrl); const b = await r.blob()
                  const u = URL.createObjectURL(b); const a = document.createElement('a')
                  a.href = u; a.download = `frameagent-studio-${Date.now()}.mp4`
                  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u)
                } catch { window.open(finalUrl, '_blank') }
              }}
              className="px-6 py-3 rounded-xl text-sm font-bold bg-[#C9A84C] text-black hover:bg-[#d4b55a] flex items-center gap-2"
            >
              <Download size={16} /> Download
            </button>
            <button onClick={() => { setStep(1); setMediaUrl(''); setAnalysis(null); setSegments([]); setFinalUrl('') }}
              className="px-6 py-3 rounded-xl text-sm bg-white/10 text-white hover:bg-white/20 flex items-center gap-2">
              <RotateCcw size={16} /> Novo vídeo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
