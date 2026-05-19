"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { previewCategorize } from "@/lib/api";
import type { CategorizePreview, TransactionsSummary } from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";
import { CategorizeReviewDialog } from "@/components/dashboard/categorize-review-dialog";

interface WidgetsRowProps {
  summary?: TransactionsSummary;
  loading: boolean;
}

export function WidgetsRow({ summary, loading }: WidgetsRowProps) {
  const topMerchants = summary?.topMerchants ?? [];
  const largestIncome = summary?.income.largest ?? null;
  const largestExpense = summary?.expense.largest ?? null;
  const pendingReviewCount = summary?.pendingReviewCount ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <TopMerchants
          merchants={topMerchants}
          loading={loading}
        />
      </div>
      <div className="flex flex-col gap-4">
        <PendingReview count={pendingReviewCount} loading={loading} />
        <חריגים
          largestIncome={largestIncome}
          largestExpense={largestExpense}
          loading={loading}
        />
      </div>
    </div>
  );
}

interface TopMerchantsProps {
  merchants: { description: string; total: number; count: number }[];
  loading: boolean;
}

function TopMerchants({ merchants, loading }: TopMerchantsProps) {
  return (
    <div className="h-full rounded-2xl border border-border bg-card p-5">
      <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
        ספקים מובילים
      </div>
      <div className="mt-3 space-y-2">
        {loading ? (
          <div className="text-sm text-muted-foreground">טוען...</div>
        ) : merchants.length === 0 ? (
          <div className="text-sm text-muted-foreground">אין עדיין ספקים.</div>
        ) : (
          merchants.map((m, idx) => (
            <div
              key={m.description}
              className="flex items-center justify-between gap-3 py-1"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-4 text-right text-xs tabular-nums text-muted-foreground">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1 truncate text-sm font-medium">
                  {m.description}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {m.count} {m.count === 1 ? "תנועה" : "תנועות"}
                </span>
                <span className="font-serif text-base tabular-nums">
                  {formatCurrency(m.total)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface PendingReviewProps {
  count: number;
  loading: boolean;
}

function PendingReview({ count, loading }: PendingReviewProps) {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<CategorizePreview | null>(null);

  const mutation = useMutation({
    mutationFn: previewCategorize,
    onSuccess: (data) => {
      if (data.uncategorizedCount === 0) {
        toast.info("אין עוד תנועות לסיווג.");
        return;
      }
      setPreview(data);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "הסיווג נכשל"
      );
    },
  });

  if (!loading && count === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
          דורש בדיקה
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          אין תנועות שמסומנות לבדיקה.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
            דורש בדיקה
          </div>
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{
              backgroundColor:
                "color-mix(in oklch, var(--status-heads-up) 18%, transparent)",
              color: "var(--status-heads-up)",
            }}
          >
            <HelpCircle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 font-serif text-3xl tabular-nums">
          {loading ? <span className="text-muted-foreground">—</span> : count}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {count === 1 ? "תנועה דורשת" : "תנועות דורשות"} בדיקה
        </div>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || loading || count === 0}
          className="mt-3 inline-flex h-8 items-center justify-center rounded-md border border-border px-3 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? "טוען..." : "בדוק עכשיו"}
        </button>
      </div>

      {preview && (
        <CategorizeReviewDialog
          preview={preview}
          onClose={() => setPreview(null)}
          onApplied={() => {
            setPreview(null);
            queryClient.invalidateQueries({ queryKey: ["summary"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({
              queryKey: ["transactions-summary"],
            });
            queryClient.invalidateQueries({ queryKey: ["categories"] });
          }}
        />
      )}
    </>
  );
}

interface חריגיםProps {
  largestIncome: TransactionsSummary["income"]["largest"];
  largestExpense: TransactionsSummary["expense"]["largest"];
  loading: boolean;
}

function חריגים({ largestIncome, largestExpense, loading }: חריגיםProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
        חריגים
      </div>
      <div className="mt-3 space-y-3">
        <OutlierRow
          label="ההוצאה הגדולה ביותר"
          txn={largestExpense}
          color="var(--status-over)"
          icon={<ArrowDownRight className="h-4 w-4" />}
          loading={loading}
        />
        <OutlierRow
          label="ההכנסה הגדולה ביותר"
          txn={largestIncome}
          color="var(--status-on-track)"
          icon={<ArrowUpRight className="h-4 w-4" />}
          loading={loading}
        />
      </div>
    </div>
  );
}

function OutlierRow({
  label,
  txn,
  color,
  icon,
  loading,
}: {
  label: string;
  txn: TransactionsSummary["income"]["largest"];
  color: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      {loading ? (
        <div className="mt-0.5 text-sm text-muted-foreground">—</div>
      ) : !txn ? (
        <div className="mt-0.5 text-sm text-muted-foreground">—</div>
      ) : (
        <div className="mt-0.5 flex items-baseline justify-between gap-3">
          <div className="min-w-0 truncate text-sm font-medium">
            {txn.description}
          </div>
          <div
            className="shrink-0 font-serif text-base tabular-nums"
            style={{ color }}
          >
            {formatCurrency(txn.chargedAmount)}
          </div>
        </div>
      )}
    </div>
  );
}
