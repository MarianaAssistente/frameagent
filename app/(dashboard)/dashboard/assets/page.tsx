import { FolderOpen } from "lucide-react";

export default function AssetsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Assets</h1>
      <p className="text-white/40 text-sm mb-8">Imagens e vídeos gerados e salvos</p>
      <div className="text-center py-24 text-white/20">
        <FolderOpen size={40} className="mx-auto mb-4 opacity-30"/>
        <p className="text-sm">Nenhum asset ainda</p>
        <p className="text-xs mt-1">Assets aparecerão aqui após o primeiro job</p>
      </div>
    </div>
  );
}
