import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Ajustes</h1>
      <p className="text-white/40 text-sm mb-8">Conta, plano e preferências</p>

      <div className="space-y-4">
        <div className="p-5 rounded-2xl border border-white/8 bg-white/[0.02]">
          <p className="text-sm font-semibold mb-1">Plano atual</p>
          <p className="text-xs text-white/40">Free — 50 créditos/mês</p>
        </div>
        <div className="p-5 rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/5">
          <p className="text-sm font-semibold text-[#C9A84C] mb-1">🚀 Upgrade disponível em breve</p>
          <p className="text-xs text-white/40">Integração com Stripe em desenvolvimento (Dia 3)</p>
        </div>
      </div>
    </div>
  );
}
