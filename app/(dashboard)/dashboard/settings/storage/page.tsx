"use client"

import { useState, useEffect } from "react"
import { HardDrive, Check, AlertCircle, Loader2, ExternalLink, Shield } from "lucide-react"

interface StorageConfig {
  provider: string
  bucket_name: string
  region: string
  endpoint_url: string
  public_base_url: string
  verified: boolean
  active: boolean
}

interface UserData {
  plan: string
  storage_plan: string
  byok_storage: boolean
  storage_used_bytes: number
}

export default function StoragePage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [config, setConfig] = useState<StorageConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const [form, setForm] = useState({
    provider: 'r2',
    bucket_name: '',
    region: 'auto',
    access_key: '',
    secret_key: '',
    endpoint_url: '',
    public_base_url: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/user').then(r => r.json()),
      fetch('/api/settings/storage').then(r => r.json()),
    ]).then(([user, storage]) => {
      setUserData(user)
      if (storage?.provider) {
        setConfig(storage)
        setForm(prev => ({
          ...prev,
          provider: storage.provider,
          bucket_name: storage.bucket_name || '',
          region: storage.region || 'auto',
          endpoint_url: storage.endpoint_url || '',
          public_base_url: storage.public_base_url || '',
        }))
      }
    }).finally(() => setLoading(false))
  }, [])

  const isScale = userData?.storage_plan === 'scale' || userData?.plan === 'scale'

  const PROVIDERS = [
    {
      id: 'r2',
      name: 'Cloudflare R2',
      desc: 'Egress gratuito, S3-compatível. Recomendado.',
      docs: 'https://developers.cloudflare.com/r2/api/s3/tokens/',
      badge: '⭐ Recomendado',
      badgeColor: 'text-yellow-400 bg-yellow-500/10',
    },
    {
      id: 's3',
      name: 'Amazon S3',
      desc: 'Alta disponibilidade, múltiplas regiões.',
      docs: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html',
      badge: null,
      badgeColor: '',
    },
    {
      id: 'gcs',
      name: 'Google Cloud Storage',
      desc: 'Integrado com GCP, HMAC keys.',
      docs: 'https://cloud.google.com/storage/docs/authentication/hmackeys',
      badge: 'Em breve',
      badgeColor: 'text-white/30 bg-white/5',
    },
  ]

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/settings/storage/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      setTestResult({ ok: res.ok, message: data.message || (res.ok ? 'Conexão OK!' : data.error) })
    } catch {
      setTestResult({ ok: false, message: 'Erro ao testar conexão' })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
        setTestResult({ ok: true, message: 'Configuração salva com sucesso!' })
      }
    } catch {
      setTestResult({ ok: false, message: 'Erro ao salvar' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-[#C9A84C]" />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <HardDrive size={24} className="text-[#C9A84C]" />
          Storage
        </h1>
        <p className="text-white/40 text-sm mt-1">Configure onde seus arquivos são armazenados</p>
      </div>

      {/* Plano atual */}
      <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Plano atual: <span className={`${isScale ? 'text-yellow-400' : 'text-white/50'}`}>{(userData?.storage_plan || 'free').toUpperCase()}</span></p>
            <p className="text-xs text-white/30 mt-0.5">
              {isScale ? 'BYOK disponível — storage ilimitado com seu próprio bucket' :
               userData?.storage_plan === 'pro' ? 'Até 500MB por arquivo no storage gerenciado' :
               'Até 50MB por arquivo no storage gerenciado'}
            </p>
          </div>
          {config?.verified && (
            <div className="flex items-center gap-1.5 text-green-400 text-xs bg-green-500/10 px-2 py-1 rounded-lg">
              <Check size={12} /> Bucket verificado
            </div>
          )}
        </div>
      </div>

      {/* Storage atual: Supabase */}
      <div className={`rounded-2xl p-4 mb-4 border cursor-pointer transition-all ${!isScale || !config?.verified ? 'border-[#C9A84C]/40 bg-[#C9A84C]/5' : 'border-white/10 bg-white/5'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Shield size={18} className="text-[#C9A84C]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Storage Gerenciado (FrameAgent)</p>
            <p className="text-xs text-white/40">Gerenciamos tudo. Sem configuração necessária.</p>
          </div>
          <div className="text-xs text-white/30">
            {!isScale ? 'Ativo' : config?.verified ? '' : 'Fallback'}
          </div>
        </div>
      </div>

      {/* BYOK Storage */}
      <div className={`rounded-2xl border p-5 ${isScale ? 'border-white/10 bg-white/[0.03]' : 'border-white/5 bg-white/[0.02] opacity-50'}`}>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-white">BYOK Storage — Bucket próprio</p>
          {!isScale && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/30">Plano SCALE</span>
          )}
        </div>
        <p className="text-xs text-white/30 mb-5">Conecte seu próprio bucket. Seus arquivos ficam sob seu controle total. Você é responsável pelos custos de storage.</p>

        {!isScale ? (
          <div className="text-center py-4">
            <p className="text-white/30 text-sm">Disponível no plano SCALE</p>
          </div>
        ) : (
          <>
            {/* Provider selector */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {PROVIDERS.map(p => (
                <button key={p.id}
                  onClick={() => p.id !== 'gcs' && setForm(f => ({ ...f, provider: p.id }))}
                  disabled={p.id === 'gcs'}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    form.provider === p.id
                      ? 'border-[#C9A84C]/60 bg-[#C9A84C]/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  } ${p.id === 'gcs' ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  <p className="text-xs font-medium text-white">{p.name}</p>
                  <p className="text-[10px] text-white/30 mt-0.5 leading-tight">{p.desc}</p>
                  {p.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded mt-1 inline-block font-medium ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Provider docs link */}
            <a href={PROVIDERS.find(p => p.id === form.provider)?.docs} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#C9A84C]/70 hover:text-[#C9A84C] mb-4 transition-colors">
              <ExternalLink size={11} />
              Como criar credenciais para {PROVIDERS.find(p => p.id === form.provider)?.name}
            </a>

            {/* Form fields */}
            <div className="space-y-3">
              {[
                { key: 'bucket_name', label: 'Nome do bucket', placeholder: 'meu-bucket-frameagent', required: true },
                { key: 'access_key', label: form.provider === 'r2' ? 'Access Key ID (R2)' : 'Access Key ID', placeholder: 'AKIAIOSFODNN7EXAMPLE', required: true, type: 'password' },
                { key: 'secret_key', label: form.provider === 'r2' ? 'Secret Access Key (R2)' : 'Secret Access Key', placeholder: '••••••••••••••••••••••••', required: true, type: 'password' },
                { key: 'endpoint_url', label: form.provider === 'r2' ? 'Endpoint URL (R2)' : 'Endpoint URL (opcional)', placeholder: form.provider === 'r2' ? 'https://ACCOUNT_ID.r2.cloudflarestorage.com' : 'https://s3.amazonaws.com', required: form.provider === 'r2' },
                { key: 'public_base_url', label: 'URL pública do bucket', placeholder: 'https://cdn.seudominio.com', required: false },
                ...(form.provider === 's3' ? [{ key: 'region', label: 'Região AWS', placeholder: 'us-east-1', required: true }] : []),
              ].map(field => (
                <div key={field.key}>
                  <label className="text-xs text-white/40 block mb-1">
                    {field.label} {field.required && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type={field.type || 'text'}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C9A84C] placeholder:text-white/20 font-mono"
                    placeholder={field.placeholder}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            {/* Test result */}
            {testResult && (
              <div className={`mt-3 p-3 rounded-xl text-sm flex items-center gap-2 ${testResult.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {testResult.ok ? <Check size={14} /> : <AlertCircle size={14} />}
                {testResult.message}
              </div>
            )}

            {/* Disclaimer */}
            <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[11px] text-white/30 leading-relaxed">
                ⚠️ <strong className="text-white/50">Você é responsável</strong> pelos custos e pela segurança do seu bucket. O FrameAgent armazena as credenciais criptografadas (AES-256-GCM) e nunca as exibe em texto claro após salvas. Certifique-se que o bucket tem as permissões corretas configuradas.
              </p>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={handleTest} disabled={testing || !form.bucket_name || !form.access_key || !form.secret_key}
                className="flex-1 py-2.5 rounded-xl text-sm border border-white/10 text-white/60 hover:bg-white/5 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                {testing ? <><Loader2 size={14} className="animate-spin" /> Testando...</> : 'Testar conexão'}
              </button>
              <button onClick={handleSave} disabled={saving || !form.bucket_name || !form.access_key || !form.secret_key}
                className="flex-1 py-2.5 rounded-xl text-sm bg-[#C9A84C] text-black font-medium hover:bg-[#d4b55a] disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar configuração'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
