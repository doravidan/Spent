"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart3, Home, ListChecks, Settings, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceTopSwitcher } from "./workspace-switcher";

const NAV_ITEMS = [
  { href: "/", label: "בית", icon: Home },
  { href: "/ceo", label: "תמונת כסף", icon: BarChart3 },
  { href: "/budget", label: "קטגוריות", icon: WalletCards },
  { href: "/transactions", label: "תנועות", icon: ListChecks },
  { href: "/settings", label: "הגדרות", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/15 text-sm font-bold text-primary">
              ד
            </div>
            <div className="hidden leading-tight sm:block">
              <div className="font-serif text-lg tracking-tight">הפיננסים של דור</div>
              <div className="text-[11px] text-muted-foreground">הכנסות · הוצאות · קטגוריות</div>
            </div>
          </Link>

          <nav className="mx-2 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-full border border-border/60 bg-card/70 p-1 md:mx-6">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <WorkspaceTopSwitcher />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  meta,
  actions,
}: {
  title: string;
  meta?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="border-b border-border/40 bg-gradient-to-b from-muted/35 to-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate font-serif text-3xl leading-none tracking-tight">
              {title}
            </h1>
            {meta && <span className="text-sm text-muted-foreground">· {meta}</span>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </section>
  );
}
