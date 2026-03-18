import { Cpu, Plus } from "lucide-react";

export default function JobsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-white/40 text-sm mt-1">Histórico de processamentos de imagem e vídeo</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background:"#C9A84C", color:"#09090b" }}>
          <Plus size={16}/> Novo Job
        </button>
      </div>

      <div className="text-center py-24 text-white/20">
        <Cpu size={40} className="mx-auto mb-4 opacity-30"/>
        <p className="text-sm">Nenhum job ainda</p>
        <p className="text-xs mt-1">Integração com fal.ai disponível no Dia 2</p>
      </div>
    </div>
  );
}
