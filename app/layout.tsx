import type { Metadata } from "next";
import { Inter } from "next/font/google";
// ClerkProvider temporarily disabled — awaiting real Clerk app keys
// import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FrameAgent — AI Media Studio",
  description: "Criação e edição de imagens e vídeos com IA para agentes. BYOK. Pipeline composável.",
  keywords: ["ai video", "image generation", "byok", "agent", "frameagent"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} bg-[#09090b] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
