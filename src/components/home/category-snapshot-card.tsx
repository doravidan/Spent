"use client";

import { CardShell, CardAction } from "./card-shell";
import { formatCurrency } from "@/lib/formatters";
import type { HomeCategorySnapshotItem } from "@/lib/types";

interface Props {
  items: HomeCategorySnapshotItem[];
}

export function CategorySnapshotCard({ items }: Props) {
  if (items.length === 0) {
    return (
      <CardShell label="הוצאות לפי קטגוריות">
        <div className="flex flex-1 items-center justify-center py-6 text-sm text-muted-foreground">
          אין עדיין הוצאות מסווגות החודש.
        </div>
      </CardShell>
    );
  }

  const total = items.reduce((sum, item) => sum + item.spent, 0);

  return (
    <CardShell
      label="הוצאות לפי קטגוריות"
      action={<CardAction href="/transactions">פתח סינון קטגוריות ←</CardAction>}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <CategoryCard key={item.categoryId} item={item} total={total} />
        ))}
      </div>
    </CardShell>
  );
}

function CategoryCard({ item, total }: { item: HomeCategorySnapshotItem; total: number }) {
  const { name, color, spent, budget, percentSpent } = item;
  const hasBudget = budget > 0;
  const share = total > 0 ? (spent / total) * 100 : 0;
  const isOver = hasBudget && percentSpent > 100;
  const status = isOver ? "חריגה" : hasBudget ? "בתקציב" : "מעקב";
  const fillWidth = hasBudget ? Math.min(100, percentSpent) : Math.min(100, share);

  return (
    <div className="rounded-2xl border border-border/70 bg-background/65 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{name}</div>
            <div className="text-xs text-muted-foreground">
              {share.toFixed(0)}% מההוצאות החודשיות
            </div>
          </div>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{
            backgroundColor: isOver
              ? "color-mix(in oklch, var(--status-over) 15%, transparent)"
              : `${color}22`,
            color: isOver ? "var(--status-over)" : color,
          }}
        >
          {status}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="font-serif text-2xl tabular-nums">{formatCurrency(spent)}</div>
        {hasBudget ? (
          <div className="text-xs text-muted-foreground tabular-nums">
            יעד {formatCurrency(budget)}
          </div>
        ) : null}
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${fillWidth}%`,
            backgroundColor: isOver ? "var(--status-over)" : color,
          }}
        />
      </div>
    </div>
  );
}
