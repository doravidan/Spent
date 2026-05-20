"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BanknoteArrowDown,
  BanknoteArrowUp,
  Brain,
  Landmark,
  LineChart,
  ListChecks,
  PiggyBank,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getCeoFinance, getHome, type CeoFinancePayload } from "@/lib/api";
import { PageHeader } from "@/components/layout/app-shell";
import { SyncButton } from "@/components/dashboard/sync-button";
import { CategorizeButton } from "@/components/dashboard/categorize-button";
import { AINotConnectedBanner } from "@/components/ai-not-connected-banner";
import { Badge } from "@/components/ui/badge";
import { SyncStatusPill } from "./sync-status-pill";
import { SyncFailureBanner } from "./sync-failure-banner";
import type { HomePayload, HomeRecentTransaction } from "@/lib/types";

const currency = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

const scopeLabel = { business: "עסקי", personal: "פרטי", all: "כללי" } as const;
const controlLabel = { fixed: "קבוע", flexible: "משתנה", review: "דורש פירוק", asset: "השקעה" } as const;

function money(value: number) {
  const abs = Math.abs(value || 0);
  const formatted = currency.format(abs);
  return value < 0 ? `-${formatted}` : formatted;
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

export function HomePage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [autoStartSync] = useState(() => searchParams.get("sync") === "1");

  useEffect(() => {
    if (autoStartSync) router.replace("/", { scroll: false });
  }, [autoStartSync, router]);

  const home = useQuery({ queryKey: ["home"], queryFn: getHome, refetchInterval: 60_000 });
  const finance = useQuery({ queryKey: ["ceo-finance"], queryFn: getCeoFinance, refetchInterval: 60_000 });

  const handleSyncOrCategorizeComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["home"] });
    queryClient.invalidateQueries({ queryKey: ["ceo-finance"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["settings"] });
  }, [queryClient]);

  return (
    <>
      <PageHeader
        title="דשבורד כסף"
        actions={
          <>
            <SyncStatusPill items={home.data?.bankHealth ?? null} nextScheduledSync={home.data?.nextScheduledSync ?? null} />
            <CategorizeButton onApplied={handleSyncOrCategorizeComplete} />
            <SyncButton onComplete={handleSyncOrCategorizeComplete} autoStart={autoStartSync} />
          </>
        }
      />

      <main dir="rtl" className="min-h-screen bg-[#081017] text-[#f8f1df]">
        <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6 lg:p-8">
          <SyncFailureBanner items={home.data?.bankHealth ?? null} />
          <AINotConnectedBanner />

          {finance.isLoading ? <LoadingDashboard /> : <CommandCenter finance={finance.data} home={home.data} />}
        </div>
      </main>
    </>
  );
}

function CommandCenter({ finance, home }: { finance?: CeoFinancePayload; home?: HomePayload }) {
  const totals = finance?.totals ?? {};
  const income = Number(totals.regularIncome ?? home?.cashFlow?.income ?? 0);
  const expenses = Number(totals.livingExpense ?? home?.cashFlow?.expenses ?? 0);
  const projectedNet = Number(totals.projectedNet ?? income - expenses);
  const projectedSpend = Number(totals.projectedLivingExpense ?? expenses);
  const fixed = Number(totals.fixedExpense ?? 0);
  const flexible = Number(totals.flexibleExpense ?? 0);
  const review = Number(totals.reviewExpense ?? 0);
  const cards = Number(totals.cardSettlements ?? 0);
  const transfers = Number(totals.transfers ?? 0);
  const investments = Number(totals.investmentsAndFx ?? 0);
  const safeToSpend = Math.max(0, income - fixed - cards - review);

  const fixedRows = (finance?.smartBudget ?? []).filter((r) => r.controllability === "fixed");
  const flexibleRows = (finance?.smartBudget ?? []).filter((r) => r.controllability === "flexible");
  const reviewRows = (finance?.smartBudget ?? []).filter((r) => r.controllability === "review");
  const categoryRows = (finance?.buckets ?? [])
    .filter((b) => b.kind === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_10%_0%,rgba(35,111,89,.55),transparent_32%),linear-gradient(135deg,#101a24,#0b1118_62%,#060a0f)] p-5 shadow-2xl md:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr] xl:items-stretch">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-sm text-emerald-100">
              <ShieldCheck size={16} /> מבוסס תזרים · חשבונות · כרטיסים · קבוע/משתנה
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">הכסף שלך — ברור, מסודר, לפעולה</h1>
              <p className="mt-4 max-w-4xl text-lg leading-8 text-[#d9cfb8]">
                {finance?.story ?? "טוען תמונת מצב מהחשבונות. המטרה: להבין מה נכנס, מה יוצא, איפה זה יוצא, ומה הפעולה הכי טובה לחיסכון."}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <HeroMetric label="נכנס החודש" value={income} icon={ArrowDownLeft} tone="good" />
              <HeroMetric label="יוצא תפעולי" value={expenses} icon={ArrowUpRight} tone="warn" />
              <HeroMetric label="צפי סוף חודש" value={projectedNet} icon={LineChart} tone={projectedNet >= 0 ? "good" : "bad"} />
              <HeroMetric label="בטוח להוציא" value={safeToSpend} icon={PiggyBank} tone="asset" />
            </div>
          </div>
          <MonthHealth finance={finance} projectedSpend={projectedSpend} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <DecisionCard finance={finance} />
        <AccountsPanel finance={finance} home={home} />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <MoneyPathCard title="איך הכסף יוצא" icon={Route}>
          <PaymentRow label="חיובי אשראי / חיובים מרוכזים" amount={cards} total={expenses + cards + transfers} detail="צריך פירוט כדי לדעת ספקים אמיתיים" tone="warn" />
          <PaymentRow label="העברות בנקאיות / שיקים" amount={transfers} total={expenses + cards + transfers} detail="דורש סיווג: עסקי, משפחה, ספקים או חד־פעמי" tone="review" />
          <PaymentRow label="הוצאות קבועות" amount={fixed} total={expenses} detail="משכנתא/קבועים — לא יעד חיסכון שבועי" tone="fixed" />
          <PaymentRow label="הוצאות משתנות" amount={flexible} total={expenses} detail="פה נמצא רוב החיסכון המיידי" tone="good" />
          <PaymentRow label="השקעות / מט״ח / מניות" amount={investments} total={expenses + investments} detail="מוצג בנפרד — לא הוצאה תזרימית" tone="asset" />
        </MoneyPathCard>

        <MoneyPathCard title="קבוע מול משתנה" icon={BanknoteArrowDown}>
          <SplitBar fixed={fixed} flexible={flexible} review={review} />
          <MiniRows rows={[...fixedRows.slice(0, 3), ...flexibleRows.slice(0, 3), ...reviewRows.slice(0, 3)]} />
        </MoneyPathCard>

        <MoneyPathCard title="מה דורש טיפול עכשיו" icon={ListChecks}>
          <AttentionQueue finance={finance} home={home} />
        </MoneyPathCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <CategoryMap rows={categoryRows} total={expenses} />
        <SavingsActions finance={finance} flexible={flexible + review} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <RecentActivity items={home?.recentTransactions ?? []} />
        <TrendPanel finance={finance} home={home} />
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-[#d9cfb8]">
        <div className="mb-2 flex items-center gap-2 text-base font-semibold text-[#f8f1df]"><Brain size={18} /> למה זה נראה ככה עכשיו?</div>
        הדשבורד מסודר לפי דפוסי Monarch/YNAB/RiseUp: קודם מצב החודש והצפי, אחר כך חשבונות וכרטיסים, ואז פירוק לפי קטגוריות, קבוע/משתנה ופעולות חיסכון. השקעות ומט״ח נשארים גלויים, אבל לא מזהמים את ההוצאות.
      </section>
    </div>
  );
}

function MonthHealth({ finance, projectedSpend }: { finance?: CeoFinancePayload; projectedSpend: number }) {
  const health = finance?.health;
  const color = health?.tone === "good" ? "text-emerald-200" : health?.tone === "bad" ? "text-red-200" : "text-amber-200";
  return (
    <aside className="flex h-full flex-col justify-between rounded-[1.75rem] border border-white/10 bg-black/25 p-5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-lg font-semibold"><Target size={20} /> מצב החודש</div>
          <Badge variant="secondary">{finance?.monthLabel ?? "טוען"}</Badge>
        </div>
        <div className={`mt-5 text-7xl font-semibold ${color}`}>{health?.score ?? "—"}</div>
        <div className="mt-1 text-2xl">{health?.label ?? "בודק נתונים"}</div>
        <p className="mt-3 text-sm leading-7 text-[#d9cfb8]">{health?.reason ?? "עוד רגע תופיע תמונת מצב."}</p>
      </div>
      <div className="mt-5 rounded-2xl bg-white/[0.05] p-4">
        <div className="flex justify-between text-sm text-[#b8ad99]"><span>תחזית הוצאות</span><span>{money(projectedSpend)}</span></div>
        <div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-gradient-to-l from-amber-300 to-red-300" style={{ width: `${Math.min(100, finance?.monthProgress ? finance.monthProgress.ratio * 100 : 50)}%` }} /></div>
        <div className="mt-2 text-xs text-[#b8ad99]">יום {finance?.monthProgress.day ?? "—"}/{finance?.monthProgress.daysInMonth ?? "—"} · נשארו {finance?.monthProgress.remainingDays ?? "—"} ימים</div>
      </div>
    </aside>
  );
}

function HeroMetric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: "good" | "warn" | "bad" | "asset" }) {
  const classes = tone === "good" ? "text-emerald-100 bg-emerald-300/10" : tone === "bad" ? "text-red-100 bg-red-300/10" : tone === "asset" ? "text-sky-100 bg-sky-300/10" : "text-amber-100 bg-amber-300/10";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <div className={`mb-3 inline-flex rounded-xl p-2 ${classes}`}><Icon size={18} /></div>
      <div className="text-sm text-[#b8ad99]">{label}</div>
      <div dir="ltr" className="mt-1 text-right text-2xl font-semibold">{money(value)}</div>
    </div>
  );
}

function DecisionCard({ finance }: { finance?: CeoFinancePayload }) {
  const d = finance?.decision;
  return (
    <section className="rounded-[2rem] border border-amber-200/20 bg-gradient-to-br from-amber-300/15 to-white/[0.04] p-5 shadow-xl">
      <div className="mb-4 flex items-center gap-2 text-xl font-semibold"><Sparkles className="text-amber-200" size={22} /> פעולה הכי חשובה לחיסכון</div>
      {d ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-3xl font-semibold text-amber-100">{d.title}</h2><Badge variant="secondary">{scopeLabel[d.scope]}</Badge></div>
          <p className="leading-8 text-[#f8f1df]">{d.detail}</p>
          <p className="rounded-2xl bg-black/20 p-3 text-sm leading-7 text-[#d9cfb8]">למה עכשיו: {d.why}</p>
          {d.monthlyImpact > 0 && <div className="grid gap-3 md:grid-cols-2"><Impact label="חיסכון חודשי משוער" value={d.monthlyImpact} /><Impact label="השפעה שנתית" value={d.annualImpact} /></div>}
        </div>
      ) : <Empty text="עוד אין מספיק מידע לפעולה." />}
    </section>
  );
}

function AccountsPanel({ finance, home }: { finance?: CeoFinancePayload; home?: HomePayload }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101922] p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-semibold"><Landmark size={22} /> חשבונות וכרטיסים</h2><Link className="text-sm text-emerald-100 hover:underline" href="/settings/bank">ניהול חיבורים ←</Link></div>
      <div className="grid gap-3 md:grid-cols-2">
        {(finance?.accounts ?? []).map((a) => <AccountTile key={`${a.provider}-${a.accountLabel}`} account={a} />)}
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {(home?.bankHealth ?? []).map((b) => <ConnectionPill key={b.provider} name={b.providerName} status={b.status} last={b.lastSyncAt} />)}
      </div>
    </section>
  );
}

function AccountTile({ account }: { account: CeoFinancePayload["accounts"][number] }) {
  const net = account.net;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3"><div><div className="font-semibold">{account.providerName}</div><div className="text-xs text-[#b8ad99]">חשבון {account.accountLabel}</div></div><Badge variant={account.scope === "business" ? "default" : "secondary"}>{scopeLabel[account.scope]}</Badge></div>
      <div dir="ltr" className={`mt-3 text-right text-2xl font-semibold ${net >= 0 ? "text-emerald-100" : "text-red-100"}`}>{money(net)}</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#d9cfb8]"><span>נכנס: {money(account.income)}</span><span>יצא: {money(account.expense)}</span></div>
    </div>
  );
}

function MoneyPathCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return <section className="rounded-[2rem] border border-white/10 bg-[#101922] p-5 shadow-xl"><h2 className="mb-4 flex items-center gap-2 text-xl font-semibold"><Icon size={22} /> {title}</h2>{children}</section>;
}

function PaymentRow({ label, amount, total, detail, tone }: { label: string; amount: number; total: number; detail: string; tone: "good" | "warn" | "review" | "fixed" | "asset" }) {
  const colors = tone === "asset" ? "bg-sky-300" : tone === "good" ? "bg-emerald-300" : tone === "fixed" ? "bg-stone-300" : tone === "review" ? "bg-orange-300" : "bg-amber-300";
  return (
    <div className="mb-3 rounded-2xl bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-3"><div className="font-medium">{label}</div><div dir="ltr" className="font-semibold">{money(amount)}</div></div>
      <div className="mt-2 h-2 rounded-full bg-white/10"><div className={`h-2 rounded-full ${colors}`} style={{ width: `${pct(amount, total)}%` }} /></div>
      <div className="mt-2 text-xs leading-5 text-[#b8ad99]">{detail}</div>
    </div>
  );
}

function SplitBar({ fixed, flexible, review }: { fixed: number; flexible: number; review: number }) {
  const total = fixed + flexible + review;
  return (
    <div className="mb-4 rounded-2xl bg-white/[0.04] p-4">
      <div className="mb-3 grid grid-cols-3 gap-2 text-sm"><span>קבוע {money(fixed)}</span><span>משתנה {money(flexible)}</span><span>לפירוק {money(review)}</span></div>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/10"><div className="bg-stone-300" style={{ width: `${pct(fixed,total)}%` }} /><div className="bg-emerald-300" style={{ width: `${pct(flexible,total)}%` }} /><div className="bg-amber-300" style={{ width: `${pct(review,total)}%` }} /></div>
    </div>
  );
}

function MiniRows({ rows }: { rows: CeoFinancePayload["smartBudget"] }) {
  return <div className="space-y-2">{rows.slice(0, 7).map((r) => <div key={`${r.scope}-${r.name}-${r.controllability}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm"><span>{r.name}</span><span className="text-[#b8ad99]">{controlLabel[r.controllability]} · {money(r.spent)}</span></div>)}</div>;
}

function AttentionQueue({ finance, home }: { finance?: CeoFinancePayload; home?: HomePayload }) {
  const items = [
    { label: "חיובי אשראי שצריך לפרק", value: money(Number(finance?.totals.cardSettlements ?? 0)), detail: "בלי פירוט אין דרך להבין לאן הכסף באמת הולך" },
    { label: "תנועות שסומנו לבדיקה", value: `${home?.needsAttention?.flagged ?? 0} תנועות`, detail: "לאשר/לתקן קטגוריה כדי לנקות רעש" },
    { label: "העברות ושיקים", value: money(Number(finance?.totals.transfers ?? 0)), detail: "להפריד ספקים, משפחה והעברות פנימיות" },
  ];
  return <div className="space-y-3">{items.map((i) => <div key={i.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="flex items-center justify-between gap-3"><span className="font-medium">{i.label}</span><Badge variant="secondary">{i.value}</Badge></div><p className="mt-2 text-sm leading-6 text-[#b8ad99]">{i.detail}</p></div>)}</div>;
}

function CategoryMap({ rows, total }: { rows: CeoFinancePayload["buckets"]; total: number }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101922] p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-semibold"><WalletCards size={22} /> לאן הכסף יוצא</h2><Link href="/transactions" className="text-sm text-emerald-100 hover:underline">פתח תנועות ←</Link></div>
      <div className="space-y-3">{rows.map((b) => <div key={`${b.scope}-${b.name}`} className="rounded-2xl bg-white/[0.04] p-4"><div className="mb-2 flex items-center justify-between gap-3"><div><div className="font-semibold">{b.name}</div><div className="text-xs text-[#b8ad99]">{scopeLabel[b.scope]} · {b.count} תנועות · {controlLabel[b.controllability]}</div></div><div dir="ltr" className="font-semibold">{money(b.amount)}</div></div><div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-emerald-300" style={{ width: `${pct(b.amount,total)}%` }} /></div>{b.topExamples.length > 0 && <div className="mt-2 text-xs text-[#b8ad99]">דוגמאות: {b.topExamples.slice(0,2).join(" · ")}</div>}</div>)}</div>
    </section>
  );
}

function SavingsActions({ finance, flexible }: { finance?: CeoFinancePayload; flexible: number }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101922] p-5 shadow-xl">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold"><PiggyBank size={22} /> איך לחסוך בפועל</h2>
      <div className="space-y-3">
        {(finance?.opportunities ?? []).slice(0, 3).map((o) => <div key={o.title} className="rounded-2xl bg-emerald-300/10 p-4"><div className="font-semibold text-emerald-100">{o.title}</div><p className="mt-2 text-sm leading-6 text-[#d9cfb8]">{o.detail}</p>{o.monthlyImpact > 0 && <div className="mt-2 text-sm text-emerald-100">פוטנציאל: {money(o.monthlyImpact)} לחודש</div>}</div>)}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">{[5,10,15].map((n) => <Impact key={n} label={`${n}% מהגמיש`} value={Math.round(flexible * n / 100)} />)}</div>
    </section>
  );
}

function RecentActivity({ items }: { items: HomeRecentTransaction[] }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101922] p-5 shadow-xl">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold"><BanknoteArrowUp size={22} /> פעילות אחרונה</h2>
      <div className="space-y-2">{items.slice(0, 8).map((t) => <Link key={t.id} href={`/transactions?search=${encodeURIComponent(t.description)}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm hover:bg-white/[0.06]"><span className="truncate">{t.description}</span><span className={t.chargedAmount >= 0 ? "text-emerald-100" : "text-red-100"}>{money(t.chargedAmount)}</span></Link>)}</div>
    </section>
  );
}

function TrendPanel({ finance, home }: { finance?: CeoFinancePayload; home?: HomePayload }) {
  const months = finance?.monthly?.slice(-6) ?? [];
  const max = Math.max(1, ...months.map((m) => Number(m.livingExpense ?? 0)));
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#101922] p-5 shadow-xl">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold"><LineChart size={22} /> מגמה וצפי</h2>
      <div className="space-y-3">{months.map((m) => <div key={String(m.month)}><div className="mb-1 flex justify-between text-sm"><span>{String(m.month)}</span><span>{money(Number(m.livingExpense ?? 0))}</span></div><div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-sky-300" style={{ width: `${pct(Number(m.livingExpense ?? 0), max)}%` }} /></div></div>)}</div>
      {home?.historicalTrend && <p className="mt-4 text-sm leading-7 text-[#b8ad99]">הקו ההיסטורי מנקה השקעות/מט״ח כדי להציג רק הוצאות תפעוליות.</p>}
    </section>
  );
}

function Impact({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-xs text-[#b8ad99]">{label}</div><div dir="ltr" className="mt-1 text-right text-xl font-semibold text-emerald-100">{money(value)}</div></div>;
}

function ConnectionPill({ name, status, last }: { name: string; status: string; last: string | null }) {
  const ok = status === "ok";
  return <div className={`rounded-xl border px-3 py-2 text-xs ${ok ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-50" : "border-amber-300/20 bg-amber-300/10 text-amber-50"}`}><div className="font-medium">{name}</div><div>{last ? `סונכרן: ${last.slice(0,10)}` : "לא סונכרן"}</div></div>;
}

function LoadingDashboard() {
  return <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-[#d9cfb8]">טוען ומסדר את תמונת הכסף…</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/15 p-4 text-[#b8ad99]">{text}</div>;
}
