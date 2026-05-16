import { NextResponse } from "next/server";
import { createParentCategory, getCategoryByName } from "@/server/db/queries/categories";
import { getWorkspaceIdFromRequest } from "@/server/lib/workspace-context";

const DOR_CATEGORIES = [
  { name: "Business Ops", icon: "briefcase-business", description: "Business operations across Dor's ventures: SaaS, contractors, tools, services." },
  { name: "EdenOS", icon: "bot", description: "EdenOS / Eden Agent Ops runtime, infra, secure gateway, reliability." },
  { name: "TaskClo", icon: "check-square", description: "TaskClo iOS/web product expenses." },
  { name: "Style My Look", icon: "sparkles", description: "AiTryOnNative / Style My Look product, App Store, creative assets." },
  { name: "TripWeaver", icon: "plane", description: "Trip planning product research, infra, APIs and content." },
  { name: "GEM", icon: "gem", description: "Gemstone/GEM media experiments and app expenses." },
  { name: "AI & Tools", icon: "brain", description: "LLM providers, coding agents, design tools, AI subscriptions." },
  { name: "Servers & Infra", icon: "server", description: "Cloud hosting, domains, storage, gateways and observability." },
  { name: "Invoices To Match", icon: "file-search", description: "Temporary bucket for charges that need email/PDF invoice matching." },
];

export async function POST(request: Request) {
  const workspaceId = getWorkspaceIdFromRequest(request);
  const created: string[] = [];
  const existing: string[] = [];

  for (const item of DOR_CATEGORIES) {
    if (getCategoryByName(workspaceId, item.name)) {
      existing.push(item.name);
      continue;
    }
    createParentCategory(workspaceId, {
      name: item.name,
      kind: "expense",
      icon: item.icon,
      description: item.description,
    });
    created.push(item.name);
  }

  return NextResponse.json({ success: true, created, existing });
}
