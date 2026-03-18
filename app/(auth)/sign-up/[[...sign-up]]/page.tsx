import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-3xl">⚡</span>
          <h1 className="text-xl font-bold mt-2">FrameAgent</h1>
          <p className="text-white/40 text-sm mt-1">Crie sua conta</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-zinc-900 border border-white/10 shadow-2xl",
              headerTitle: "text-white",
              headerSubtitle: "text-white/50",
              socialButtonsBlockButton: "border-white/10 text-white hover:bg-white/5",
              dividerLine: "bg-white/10",
              dividerText: "text-white/30",
              formFieldLabel: "text-white/70",
              formFieldInput: "bg-zinc-800 border-white/10 text-white",
              footerActionLink: "text-[#C9A84C]",
              formButtonPrimary: "bg-[#C9A84C] text-zinc-900 hover:bg-[#B8973B]",
            },
          }}
        />
      </div>
    </div>
  );
}
