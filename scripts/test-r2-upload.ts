/**
 * Script de teste — upload para R2
 * Uso: npx tsx scripts/test-r2-upload.ts
 *
 * Requer env vars:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET_NAME, R2_PUBLIC_URL (opcional)
 */

import { uploadToR2 } from "../lib/r2";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function main() {
  console.log("🚀 Teste de upload R2\n");

  // Verificar env vars
  const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
  const missing  = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error("❌ Env vars faltando:", missing.join(", "));
    console.error("   Configure no .env.local ou Vercel dashboard");
    process.exit(1);
  }

  console.log("✅ Env vars OK");
  console.log("   Bucket:", process.env.R2_BUCKET_NAME);
  console.log("   Account:", process.env.R2_ACCOUNT_ID?.slice(0, 8) + "...\n");

  // Criar arquivo de teste temporário
  const testContent = Buffer.from(JSON.stringify({
    test: true,
    timestamp: new Date().toISOString(),
    message: "FrameAgent R2 upload test",
  }, null, 2));

  const testKey = `tests/upload-test-${Date.now()}.json`;

  try {
    console.log("📤 Fazendo upload...");
    const result = await uploadToR2(testKey, testContent, "application/json", {
      "x-frameagent-test": "true",
    });

    console.log("✅ Upload OK!");
    console.log("   Key:", result.key);
    console.log("   URL:", result.url);
    console.log("   Tamanho:", result.size, "bytes");
    console.log("\n🎉 R2 configurado corretamente!");
  } catch (err: any) {
    console.error("❌ Erro no upload:", err.message);
    if (err.message.includes("AccessDenied")) {
      console.error("   → Verifique se R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY são credenciais de um R2 Token (não o CF_API_TOKEN)");
    }
    if (err.message.includes("NoSuchBucket")) {
      console.error("   → Bucket não encontrado. Verifique R2_BUCKET_NAME ou crie o bucket no Cloudflare dashboard.");
    }
    process.exit(1);
  }
}

main();
