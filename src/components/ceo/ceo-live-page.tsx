"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Bot,
  BriefcaseBusiness,
  CreditCard,
  FileText,
  Gauge,
  Landmark,
  PiggyBank,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getCeoFinance,
  getSetupStatus,
  listIntegrations,
  startSync,
  type CeoFinancePayload,
  type SyncProgressEvent,
} from "@/lib/api";
import type { Integration, SetupStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const currency = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

function money(value: number) {
  const abs = Math.abs(value);
  const formatted = currency.format(abs);
  return value < 0 ? `-${formatted}` : formatted;
}

const scopeLabel = { business: "עסקי", personal: "פרטי", all: "כללי" } as const;

export function CeoLivePage() {
  const queryClient = useQueryClient();
  const finance = useQuery({ queryKey: ["ceo-finance"], queryFn: getCeoFinance, refetchInterval: 60_000 });
  const integrations = useQuery({ queryKey: ["integrations"], queryFn: listIntegrations, refetchInterval: 60_000 });
  const setup = useQuery({ queryKey: ["setup-status"], queryFn: getSetupStatus });
  const data = finance.data;
  const headline = useMemo(() => buildHeadline(data), [data]);

  const handleSync = () => {
    const sync = startSync(undefined, (event: SyncProgressEvent) => {
      if (["complete", "error", "provider-done"].includes(event.type)) {
        queryClient.invalidateQueries({ queryKey: ["ceo-finance"] });
        queryClient.invalidateQueries({ queryKey: ["integrations"] });
      }
    });
    return () => sync.cancel();
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#0b0f14] text-[#f7f0df]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,#235444_0,#121a24_48%,#0b0f14_100%)] p-6 shadow-2xl md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-sm text-emerald-100">
                <ShieldCheck size={16} /> Live local finance · One Zero עסקי · Mercantile פרטי
              </div>
              <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">CEO Finance — מה לעשות עם הכסף החודש?</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[#d9cfb8]">
                {headline}
              </p>
              {data && (
                <p className="mt-3 text-sm text-[#b8ad99]">
                  חודש מוצג: {data.monthLabel} · כיסוי נתונים: {data.coverage.transactionCount} תנועות, {data.coverage.from?.slice(0, 10)}–{data.coverage.to?.slice(0, 10)}
                </p>
              )}
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/25 p-5 text-sm text-[#d9cfb8]">
              <div className="mb-3 flex items-center gap-2 text-[#f7f0df]"><Bot size={18}/> פעולה</div>
              <p>{data ? "הנתונים חיים מה־SQLite המקומי. הכרטיסים המרוכזים ומניות/מט״ח מופרדים כדי שלא יבלבלו את התזרים." : "טוען נתונים חיים..."}</p>
              <div className="mt-4 flex gap-2">
                <Link href="/settings/bank" className="inline-flex h-8 items-center justify-center rounded-md bg-secondary px-3 text-xs font-medium text-secondary-foreground hover:bg-secondary/80">חיבורים</Link>
                <Button size="sm" onClick={handleSync}><RefreshCw className="ml-2 h-4 w-4"/>סנכרון עכשיו</Button>
              </div>
            </div>
          </div>
        </section>

        {!setup.data?.hasBankCredentials && <SetupCallout setup={setup.data} />}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Kpi label="הכנסה עסקית" value={data?.totals.businessIncome ?? 0} icon={BriefcaseBusiness} tone="good" detail="One Zero + הכנסות עסקיות מזוהות" />
          <Kpi label="הוצאה עסקית" value={data?.totals.businessExpense ?? 0} icon={CreditCard} tone="warn" detail="כולל חיובי כרטיס עסקיים מרוכזים" />
          <Kpi label="נטו פרטי" value={data?.totals.personalNet ?? 0} icon={PiggyBank} tone={(data?.totals.personalNet ?? 0) >= 0 ? "good" : "bad"} detail="Mercantile: הכנסות פחות הוצאות פרטיות" />
          <Kpi label="מניות / מט״ח בנפרד" value={data?.totals.investmentsAndFx ?? 0} icon={TrendingUp} tone="asset" detail="לא נספר כהוצאה שוטפת" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
          <Card title="Decision #1 — איפה להתחיל לחסוך" icon={Sparkles}>
            <div className="space-y-3">
              {(data?.opportunities ?? []).map((o) => (
                <div key={o.title} className="rounded-3xl bg-[#f2d28b]/10 p-5">
                  <div className="mb-1 flex items-center justify-between gap-3 text-[#f2d28b]"><span>{o.title}</span><Badge variant="secondary">{scopeLabel[o.scope]}</Badge></div>
                  <p className="leading-7 text-[#f7f0df]">{o.detail}</p>
                  {o.monthlyImpact > 0 && <div className="mt-3 text-sm text-emerald-100">פוטנציאל ריאלי: {money(o.monthlyImpact)} לחודש / {money(o.annualImpact)} לשנה</div>}
                </div>
              ))}
              {!data?.opportunities?.length && <Empty text="אין עדיין מספיק נתונים להחלטה." />}
            </div>
          </Card>

          <Card title="חשבונות והפרדה עסקי/פרטי" icon={Landmark}>
            <div className="space-y-3">
              {(data?.accounts ?? []).map((a) => <AccountRow key={`${a.provider}-${a.accountLabel}`} item={a} />)}
            </div>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <Card title="פירוק החודש לפי קטגוריות חכמות" icon={Gauge}>
            <div className="space-y-3">
              {(data?.buckets ?? []).slice(0, 12).map((b) => <BucketRow key={`${b.scope}-${b.kind}-${b.name}`} bucket={b} />)}
            </div>
          </Card>
          <Card title="איכות נתונים ומה חסר" icon={AlertTriangle}>
            <div className="space-y-3">
              {(data?.dataQuality ?? []).map((q) => <QualityRow key={q.text} item={q} />)}
              <div className="rounded-2xl bg-white/[0.04] p-4 text-sm leading-7 text-[#d9cfb8]">
                <FileText className="mb-2 h-5 w-5 text-[#f2d28b]" />
                כדי לענות “על מה הלך כל דבר” ברמת ספק, צריך את פירוט הכרטיסים/חשבוניות. כרגע הבנק מציג חלק מהכסף כחיוב כרטיס מרוכז ולכן הוא מסומן כ־“פירוט חסר”.
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <Card title="מגמת חודשים — עסקי/פרטי/מניות" icon={Activity}>
            <div className="space-y-2">
              {(data?.monthly ?? []).map((m) => <MonthRow key={String(m.month)} month={m} />)}
            </div>
          </Card>
          <Card title="חיבורי בנקים ואשראי" icon={WalletCards}>
            <div className="space-y-3">
              {(integrations.data ?? []).map((item) => <ConnectionRow key={item.provider} item={item} />)}
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}

function buildHeadline(data?: CeoFinancePayload) {
  if (!data) return "טוען את הנתונים החיים מהחשבונות.";
  const t = data.totals;
  if (t.cardSettlements > 0) {
    return `החודש יש ${money(t.cardSettlements)} בחיובי כרטיסים מרוכזים שצריך לפרק, ו-${money(t.investmentsAndFx)} בפעילות מניות/מט״ח שמופרדת מהתזרים. הנטו העסקי הוא ${money(t.businessNet)}, והנטו הפרטי הוא ${money(t.personalNet)}.`;
  }
  return `הנטו העסקי הוא ${money(t.businessNet)}, הנטו הפרטי הוא ${money(t.personalNet)}, ופעילות ההשקעות מופרדת כדי לא לעוות את החודש.`;
}

function SetupCallout({ setup }: { setup?: SetupStatus }) {
  return (
    <section className="rounded-[2rem] border border-amber-300/20 bg-amber-300/10 p-5 text-amber-50">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-lg font-semibold"><AlertTriangle size={20}/> צריך חיבור חשבון אמיתי</div>
          <p className="text-amber-100/90">לא שולחים סיסמאות בצ׳אט. מחברים בנק/אשראי מקומית, והפרטים נשמרים מוצפנים.</p>
        </div>
        <Link href="/settings/bank" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">פתח חיבורים</Link>
      </div>
      {setup && <div className="mt-3 text-sm text-amber-100/80">AI provider: {setup.hasAIProvider ? "מחובר" : "לא מחובר"}</div>}
    </section>
  );
}

function Kpi({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: LucideIcon; tone: "good" | "warn" | "bad" | "asset" }) {
  const colors = tone === "good" ? "text-emerald-200 bg-emerald-300/10" : tone === "bad" ? "text-red-200 bg-red-300/10" : tone === "asset" ? "text-sky-200 bg-sky-300/10" : "text-amber-200 bg-amber-300/10";
  return <div className="rounded-3xl border border-white/10 bg-[#111922] p-5 shadow-xl"><div className={`mb-4 inline-flex rounded-2xl p-3 ${colors}`}><Icon size={22}/></div><div className="text-sm text-[#b8ad99]">{label}</div><div dir="ltr" className="mt-2 text-right text-3xl font-semibold">{money(value)}</div><div className="mt-2 text-sm text-[#d9cfb8]">{detail}</div></div>;
}

function Card({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return <section className="rounded-[2rem] border border-white/10 bg-[#111922] p-6 shadow-xl"><h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold"><Icon size={22}/>{title}</h2>{children}</section>;
}

function AccountRow({ item }: { item: CeoFinancePayload["accounts"][number] }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center justify-between gap-3"><div className="font-medium">{item.providerName} {item.accountLabel}</div><Badge variant={item.scope === "business" ? "default" : "secondary"}>{scopeLabel[item.scope]}</Badge></div><div className="mt-2 grid gap-2 text-sm text-[#d9cfb8] md:grid-cols-3"><span>הכנסות: {money(item.income)}</span><span>הוצאות: {money(item.expense)}</span><span>נטו: {money(item.net)}</span></div><div className="mt-1 text-xs text-[#b8ad99]">{item.count} תנועות · {item.from.slice(0,10)}–{item.to.slice(0,10)}</div></div>;
}

function BucketRow({ bucket }: { bucket: CeoFinancePayload["buckets"][number] }) {
  const tone = bucket.kind === "asset" ? "text-sky-200" : bucket.kind === "income" ? "text-emerald-200" : bucket.controllability === "review" ? "text-amber-100" : "text-[#f7f0df]";
  return <div className="rounded-2xl bg-white/[0.04] p-4"><div className="flex items-center justify-between gap-3"><div><div className="font-medium">{bucket.name}</div><div className="text-xs text-[#b8ad99]">{scopeLabel[bucket.scope]} · {bucket.count} תנועות · {bucket.controllability}</div></div><div dir="ltr" className={`text-lg font-semibold ${tone}`}>{money(bucket.amount)}</div></div><p className="mt-2 text-sm leading-6 text-[#d9cfb8]">{bucket.note}</p>{bucket.topExamples.length > 0 && <div className="mt-2 text-xs text-[#b8ad99]">דוגמאות: {bucket.topExamples.join(" · ")}</div>}</div>;
}

function QualityRow({ item }: { item: CeoFinancePayload["dataQuality"][number] }) {
  const cls = item.severity === "action" ? "border-amber-300/30 bg-amber-300/10 text-amber-50" : item.severity === "warning" ? "border-red-300/30 bg-red-300/10 text-red-50" : "border-emerald-300/20 bg-emerald-300/10 text-emerald-50";
  return <div className={`rounded-2xl border p-4 text-sm leading-7 ${cls}`}>{item.text}</div>;
}

function MonthRow({ month }: { month: Record<string, number | string> }) {
  return <div className="grid gap-2 rounded-2xl bg-white/[0.04] p-3 text-sm md:grid-cols-4"><div className="font-medium">{String(month.month)}</div><div>עסקי נטו: {money(Number(month.businessIncome) - Number(month.businessExpense))}</div><div>פרטי נטו: {money(Number(month.personalIncome) - Number(month.personalExpense))}</div><div>מניות/כרטיסים: {money(Number(month.investmentsAndFx) + Number(month.cardSettlements))}</div></div>;
}

function ConnectionRow({ item }: { item: Integration }) {
  const status = item.lastSyncAt ? "synced" : "never synced";
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 font-medium"><Landmark size={17}/>{item.provider}</div><Badge variant={item.lastSyncAt ? "default" : "secondary"}>{status}</Badge></div><div className="mt-1 text-sm text-[#b8ad99]">סנכרון אחרון: {item.lastSyncAt ?? "עדיין לא רץ"} · {item.transactionCount} תנועות</div></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/15 p-4 text-[#b8ad99]">{text}</div>;
}
