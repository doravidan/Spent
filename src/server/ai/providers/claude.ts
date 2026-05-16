import "server-only";

// Remote AI is intentionally disabled in Dor's local-only build.
// This placeholder prevents accidental imports from re-enabling Anthropic data flow.
export class ClaudeProvider {
  constructor() {
    throw new Error("Remote AI is disabled in Dor's local-only build.");
  }
}
