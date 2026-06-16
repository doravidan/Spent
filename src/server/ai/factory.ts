import "server-only";

import type { AIProvider } from "./types";
import { OllamaProvider } from "./providers/ollama";
import { OpenRouterProvider } from "./providers/openrouter";
import { getSetting } from "../db/queries/settings";
import { decrypt } from "../lib/encryption";

export const DEFAULT_OPENROUTER_FREE_MODEL = "qwen/qwen3-coder:free";

export function getOpenRouterApiKey(): string | null {
  const envKey = process.env.OPENROUTER_API_KEY?.trim();
  if (envKey) return envKey;

  const encryptedKey = getSetting("ai_openrouter_api_key_encrypted");
  const iv = getSetting("ai_openrouter_api_key_iv");
  const authTag = getSetting("ai_openrouter_api_key_auth_tag");
  if (!encryptedKey || !iv || !authTag) return null;

  try {
    return decrypt({
      encrypted: Buffer.from(encryptedKey, "base64"),
      iv: Buffer.from(iv, "base64"),
      authTag: Buffer.from(authTag, "base64"),
    });
  } catch {
    return null;
  }
}

export function createAIProvider(): AIProvider | null {
  const provider = getSetting("ai_provider");

  if (provider === "ollama") {
    const url = getSetting("ai_ollama_url") ?? "http://localhost:11434";
    const model = getSetting("ai_ollama_model") ?? "llama3.1";
    return new OllamaProvider(url, model);
  }

  if (provider === "openrouter") {
    const apiKey = getOpenRouterApiKey();
    if (!apiKey) return null;
    const model = getSetting("ai_openrouter_model") ?? DEFAULT_OPENROUTER_FREE_MODEL;
    return new OpenRouterProvider(apiKey, model);
  }

  return null;
}
