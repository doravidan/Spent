import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  // Block embedding in iframes from other origins.
  { key: "X-Frame-Options", value: "DENY" },
  // Stop the browser from MIME-sniffing responses.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak the originating URL on outbound links.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lock down browser capabilities this app never needs.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // CSP for a local-only app: only same-origin scripts/styles and local
  // Ollama. Inline styles are required by shadcn/Tailwind. No remote AI,
  // favicon, analytics, or font endpoints are allowed by default.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: blob:",
      "connect-src 'self' http://localhost:11434 http://127.0.0.1:11434 ws://127.0.0.1:* ws://localhost:*",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "israeli-bank-scrapers"],
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
