import { NextResponse } from "next/server";
import { setSetting, deleteGlobalSetting } from "@/server/db/queries/settings";
import { encrypt } from "@/server/lib/encryption";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    provider: "claude" | "ollama" | "openrouter" | "none";
    ollamaUrl?: string;
    ollamaModel?: string;
    openrouterModel?: string;
    openrouterApiKey?: string;
  };

  if (body.provider === "claude") {
    return NextResponse.json(
      { success: false, message: "Use OpenRouter or local Ollama in Dor's build." },
      { status: 400 }
    );
  }

  setSetting("ai_provider", body.provider);
  deleteGlobalSetting("ai_api_key_encrypted");
  deleteGlobalSetting("ai_api_key_iv");
  deleteGlobalSetting("ai_api_key_auth_tag");

  if (body.provider === "ollama") {
    if (body.ollamaUrl) setSetting("ai_ollama_url", body.ollamaUrl);
    if (body.ollamaModel) setSetting("ai_ollama_model", body.ollamaModel);
  }

  if (body.provider === "openrouter") {
    setSetting("ai_openrouter_model", body.openrouterModel || "qwen/qwen3-coder:free");
    if (body.openrouterApiKey?.trim()) {
      const encrypted = encrypt(body.openrouterApiKey.trim());
      setSetting("ai_openrouter_api_key_encrypted", encrypted.encrypted.toString("base64"));
      setSetting("ai_openrouter_api_key_iv", encrypted.iv.toString("base64"));
      setSetting("ai_openrouter_api_key_auth_tag", encrypted.authTag.toString("base64"));
    }
  }

  return NextResponse.json({ success: true });
}
