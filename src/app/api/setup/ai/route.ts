import { NextResponse } from "next/server";
import { setSetting, deleteGlobalSetting } from "@/server/db/queries/settings";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    provider: "claude" | "ollama" | "none";
    ollamaUrl?: string;
    ollamaModel?: string;
  };

  if (body.provider === "claude") {
    return NextResponse.json(
      { success: false, message: "Remote AI is disabled in Dor's local-only build." },
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

  return NextResponse.json({ success: true });
}
