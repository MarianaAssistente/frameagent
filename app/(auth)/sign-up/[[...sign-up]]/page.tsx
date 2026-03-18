// Clerk SignUp temporarily replaced with placeholder — awaiting real Clerk keys
// import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <span className="text-3xl">⚡</span>
        <h1 className="text-xl font-bold mt-2">FrameAgent</h1>
        <p className="text-white/40 text-sm mt-4">
          Cadastro em configuração.<br/>
          Aguardando chaves Clerk do administrador.
        </p>
        <a href="/" className="mt-6 inline-block text-[#C9A84C] text-sm hover:underline">← Voltar</a>
      </div>
    </div>
  );
}
