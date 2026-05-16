import "server-only";

import type { AIProvider } from "./types";
import { OllamaProvider } from "./providers/ollama";
import { getSetting } from "../db/queries/settings";

export function createAIProvider(): AIProvider | null {
  const provider = getSetting("ai_provider");

  if (provider === "ollama") {
    const url = getSetting("ai_ollama_url") ?? "http://localhost:11434";
    const model = getSetting("ai_ollama_model") ?? "llama3.1";
    return new OllamaProvider(url, model);
  }

  return null;
}
