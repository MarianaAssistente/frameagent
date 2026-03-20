"use client"

import { useRef, useState, useEffect } from "react"
import { Eraser, Brush, RotateCcw, Check } from "lucide-react"

interface MaskCanvasProps {
  imageUrl: string
  onMaskReady: (maskDataUrl: string) => void
  onCancel: () => void
}

export function MaskCanvas({ imageUrl, onMaskReady, onCancel }: MaskCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageCanvasRef = useRef<HTMLCanvasElement>(null)
  const [brushSize, setBrushSize] = useState(30)
  const [isDrawing, setIsDrawing] = useState(false)
  const [mode, setMode] = useState<"brush" | "eraser">("brush")
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      imgRef.current = img
      const canvas = canvasRef.current
      const imgCanvas = imageCanvasRef.current
      if (!canvas || !imgCanvas) return

      const maxW = 800
      const scale = img.width > maxW ? maxW / img.width : 1
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      canvas.width = w
      canvas.height = h
      imgCanvas.width = w
      imgCanvas.height = h

      const imgCtx = imgCanvas.getContext("2d")!
      imgCtx.drawImage(img, 0, 0, w, h)

      const ctx = canvas.getContext("2d")!
      ctx.clearRect(0, 0, w, h)
    }
    img.src = imageUrl
  }, [imageUrl])

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    const pos = getPos(e)

    ctx.globalCompositeOperation = mode === "brush" ? "source-over" : "destination-out"
    ctx.fillStyle = "white"
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  function clearMask() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  function exportMask() {
    const canvas = canvasRef.current!

    const exportCanvas = document.createElement("canvas")
    exportCanvas.width = canvas.width
    exportCanvas.height = canvas.height
    const ctx = exportCanvas.getContext("2d")!

    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(canvas, 0, 0)

    onMaskReady(exportCanvas.toDataURL("image/png"))
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <button onClick={() => setMode("brush")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${mode === "brush" ? "bg-[#C9A84C] text-black" : "bg-white/10 text-white/60 hover:bg-white/20"}`}>
          <Brush size={13} /> Pincel
        </button>
        <button onClick={() => setMode("eraser")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${mode === "eraser" ? "bg-[#C9A84C] text-black" : "bg-white/10 text-white/60 hover:bg-white/20"}`}>
          <Eraser size={13} /> Borracha
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Tamanho:</span>
          <input type="range" min={5} max={80} value={brushSize}
            onChange={e => setBrushSize(Number(e.target.value))}
            className="w-20 accent-[#C9A84C]" />
          <span className="text-xs text-white/40 w-6">{brushSize}</span>
        </div>
        <button onClick={clearMask}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/10 text-white/60 hover:bg-white/20 transition-colors">
          <RotateCcw size={13} /> Limpar
        </button>
      </div>

      <p className="text-xs text-white/40">Pinte a área que deseja editar (branco = editar)</p>

      <div className="relative rounded-xl overflow-hidden border border-white/10 cursor-crosshair"
        style={{ maxWidth: '100%' }}>
        <canvas ref={imageCanvasRef} className="block max-w-full" style={{ maxHeight: '50vh' }} />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 max-w-full"
          style={{ opacity: 0.6, maxHeight: '50vh' }}
          onMouseDown={e => { setIsDrawing(true); draw(e) }}
          onMouseMove={draw}
          onMouseUp={() => setIsDrawing(false)}
          onMouseLeave={() => setIsDrawing(false)}
          onTouchStart={e => { setIsDrawing(true); draw(e) }}
          onTouchMove={draw}
          onTouchEnd={() => setIsDrawing(false)}
        />
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white bg-white/5 hover:bg-white/10 transition-colors">
          Cancelar
        </button>
        <button onClick={exportMask}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[#C9A84C] text-black font-medium hover:bg-[#d4b55a] transition-colors">
          <Check size={14} /> Confirmar máscara
        </button>
      </div>
    </div>
  )
}
