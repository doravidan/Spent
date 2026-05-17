"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  CreditCard,
  FileText,
  Gauge,
  Landmark,
  ListChecks,
  PiggyBank,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
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
const controlLabel = { fixed: "קבוע", flexible: "גמיש", review: "דורש פירוק", asset: "נכס" } as const;

export function CeoLivePage() {
  const queryClient = useQueryClient();
  const finance = useQuery({ queryKey: ["ceo-finance"], queryFn: getCeoFinance, refetchInterval: 60_000 });
  const integrations = useQuery({ queryKey: ["integrations"], queryFn: listIntegrations, refetchInterval: 60_000 });
  const setup = useQuery({ queryKey: ["setup-status"], queryFn: getSetupStatus });
  const data = finance.data;
  const headline = useMemo(() => data?.story ?? "טוען את הנתונים החיים מהחשבונות.", [data]);

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
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,#32624f_0,#121a24_48%,#0b0f14_100%)] p-6 shadow-2xl md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-sm text-emerald-100">
                <ShieldCheck size={16} /> תזרים חי · הפרדה עסקי/פרטי · השקעות מחוץ למחיה
              </div>
              <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">מה לעשות עם הכסף החודש?</h1>
              <p className="mt-4 max-w-4xl text-lg leading-8 text-[#d9cfb8]">{headline}</p>
              {data && (
                <div className="mt-4 flex flex-wrap gap-2 text-sm text-[#b8ad99]">
                  <span className="rounded-full bg-white/5 px-3 py-1">חודש: {data.monthLabel}</span>
                  <span className="rounded-full bg-white/5 px-3 py-1">יום {data.monthProgress.day}/{data.monthProgress.daysInMonth}</span>
                  <span className="rounded-full bg-white/5 px-3 py-1">{data.coverage.transactionCount} תנועות</span>
                </div>
              )}
            </div>
            <HealthCard data={data} />
          </div>
        </section>

        {!setup.data?.hasBankCredentials && <SetupCallout setup={setup.data} />}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Kpi label="הכנסות אמיתיות" value={data?.totals.regularIncome ?? 0} icon={PiggyBank} tone="good" detail="שכר + הכנסות עסקיות, בלי מניות/העברות" />
          <Kpi label="הוצאות מחיה/תפעול" value={data?.totals.livingExpense ?? 0} icon={CreditCard} tone="warn" detail="מה שבאמת שייך לחודש" />
          <Kpi label="תחזית נטו סוף חודש" value={data?.totals.projectedNet ?? 0} icon={Gauge} tone={(data?.totals.projectedNet ?? 0) >= 0 ? "good" : "bad"} detail="קבוע נשאר קבוע, גמיש מוקרן לפי הקצב" />
          <Kpi label="השקעות / מט״ח" value={data?.totals.investmentsAndFx ?? 0} icon={TrendingUp} tone="asset" detail="מופרד כדי לא לעוות את ההוצאות" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
          <DecisionPanel data={data} />
          <SavingsPanel data={data} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <Card title="תקציב חכם — כמו RiseUp, אבל עם הפרדה עסקי/פרטי" icon={Target}>
            <div className="space-y-3">
              {(data?.smartBudget ?? []).slice(0, 10).map((row) => <SmartBudgetRow key={`${row.scope}-${row.kind}-${row.name}`} row={row} />)}
              {!data?.smartBudget?.length && <Empty text="אין עדיין מספיק תנועות לתקציב חכם." />}
            </div>
          </Card>
          <CoachPanel data={data} />
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <Card title="פירוק החודש: הכנסות / הוצאות / נכסים / העברות" icon={ListChecks}>
            <div className="space-y-3">
              {(data?.buckets ?? []).slice(0, 12).map((b) => <BucketRow key={`${b.scope}-${b.kind}-${b.name}`} bucket={b} />)}
            </div>
          </Card>
          <Card title="חשבונות והפרדה עסקי/פרטי" icon={Landmark}>
            <div className="space-y-3">
              {(data?.accounts ?? []).map((a) => <AccountRow key={`${a.provider}-${a.accountLabel}`} item={a} />)}
            </div>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <Card title="מגמת חודשים — עסקי/פרטי/נכסים" icon={Activity}>
            <div className="space-y-2">
              {(data?.monthly ?? []).slice(-8).map((m) => <MonthRow key={String(m.month)} month={m} />)}
            </div>
          </Card>
          <Card title="איכות נתונים וחיבורי בנק" icon={WalletCards}>
            <div className="space-y-3">
              {(data?.dataQuality ?? []).map((q) => <QualityRow key={q.text} item={q} />)}
              <div className="rounded-2xl bg-white/[0.04] p-4 text-sm leading-7 text-[#d9cfb8]">
                <FileText className="mb-2 h-5 w-5 text-[#f2d28b]" />
                המערכת מראה איפה חסר פירוט: חיובי כרטיסים, העברות ושיקים. אלה לא “הוצאה אחת” — הם תור עבודה לפירוק.
              </div>
              {(integrations.data ?? []).map((item) => <ConnectionRow key={item.provider} item={item} />)}
            </div>
          </Card>
        </section>

        <div className="flex justify-end gap-2">
          <Link href="/settings/bank" className="inline-flex h-9 items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-secondary/80">חיבורים</Link>
          <Button size="sm" onClick={handleSync}><RefreshCw className="ml-2 h-4 w-4"/>סנכרון עכשיו</Button>
        </div>
      </div>
    </main>
  );
}

function HealthCard({ data }: { data?: CeoFinancePayload }) {
  const health = data?.health;
  const color = health?.tone === "good" ? "text-emerald-200" : health?.tone === "bad" ? "text-red-200" : "text-amber-200";
  return (
    <div className="min-w-[280px] rounded-3xl border border-white/10 bg-black/25 p-5">
      <div className="mb-2 flex items-center gap-2 text-[#f7f0df]"><Bot size={18}/> מצב החודש</div>
      <div className={`text-5xl font-semibold ${color}`}>{health?.score ?? "—"}</div>
      <div className="mt-1 text-xl">{health?.label ?? "טוען"}</div>
      <p className="mt-3 text-sm leading-6 text-[#d9cfb8]">{health?.reason ?? "בודק את התזרים."}</p>
    </div>
  );
}

function DecisionPanel({ data }: { data?: CeoFinancePayload }) {
  const d = data?.decision;
  return (
    <Card title="החלטה #1 — הפעולה הכי חשובה עכשיו" icon={Sparkles}>
      {d ? (
        <div className="rounded-3xl bg-[#f2d28b]/10 p-5">
          <div className="mb-2 flex items-center justify-between gap-3 text-[#f2d28b]"><span className="text-xl font-semibold">{d.title}</span><Badge variant="secondary">{scopeLabel[d.scope]}</Badge></div>
          <p className="leading-7 text-[#f7f0df]">{d.detail}</p>
          <p className="mt-3 text-sm leading-6 text-[#d9cfb8]">למה: {d.why}</p>
          {d.monthlyImpact > 0 && <div className="mt-4 rounded-2xl bg-emerald-300/10 p-3 text-emerald-100">השפעה ריאלית: {money(d.monthlyImpact)} לחודש / {money(d.annualImpact)} לשנה</div>}
        </div>
      ) : <Empty text="אין עדיין החלטה." />}
    </Card>
  );
}

function SavingsPanel({ data }: { data?: CeoFinancePayload }) {
  return (
    <Card title="תרחישי חיסכון גמישים" icon={PiggyBank}>
      <div className="grid gap-3 md:grid-cols-3">
        {(data?.savingsScenarios ?? []).map((s) => (
          <div key={s.label} className="rounded-2xl bg-white/[0.04] p-4">
            <div className="text-sm text-[#b8ad99]">{s.label}</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-100">{money(s.monthly)}</div>
            <div className="mt-2 text-xs leading-5 text-[#d9cfb8]">רבעון: {money(s.quarterly)}<br/>שנה: {money(s.annual)}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-7 text-[#d9cfb8]">התרחישים מחושבים רק על הוצאות גמישות/דורשות פירוק, לא על משכנתא ולא על השקעות.</p>
    </Card>
  );
}

function CoachPanel({ data }: { data?: CeoFinancePayload }) {
  return (
    <Card title="מאמן שבועי" icon={CheckCircle2}>
      <div className="space-y-3">
        {(data?.weeklyCoach ?? []).map((a) => (
          <div key={a.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3"><div className="font-medium">{a.title}</div><Badge variant={a.checked ? "default" : "secondary"}>{a.checked ? "בוצע" : "לביצוע"}</Badge></div>
            <p className="mt-2 text-sm leading-6 text-[#d9cfb8]">{a.detail}</p>
            {a.amount > 0 && <div className="mt-2 text-xs text-[#b8ad99]">סכום קשור: {money(a.amount)}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
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
      {setup && <div className="mt-3 text-sm text-amber-100/80">AI: {setup.hasAIProvider ? "מחובר" : "לא מחובר"}</div>}
    </section>
  );
}

function Kpi({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: LucideIcon; tone: "good" | "warn" | "bad" | "asset" }) {
  const colors = tone === "good" ? "text-emerald-200 bg-emerald-300/10" : tone === "bad" ? "text-red-200 bg-red-300/10" : tone === "asset" ? "text-sky-200 bg-sky-300/10" : "text-amber-200 bg-amber-300/10";
  return <div className="rounded-3xl border border-white/10 bg-[#111922] p-5 shadow-xl"><div className={`mb-4 inline-flex rounded-2xl p-3 ${colors}`}><Icon size={22}/></div><div className="text-sm text-[#b8ad99]">{label}</div><div dir="ltr" className="mt-2 text-right text-3xl font-semibold">{money(value)}</div><div className="mt-2 text-sm leading-6 text-[#d9cfb8]">{detail}</div></div>;
}

function Card({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return <section className="rounded-[2rem] border border-white/10 bg-[#111922] p-6 shadow-xl"><h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold"><Icon size={22}/>{title}</h2>{children}</section>;
}

function SmartBudgetRow({ row }: { row: CeoFinancePayload["smartBudget"][number] }) {
  return <div className="rounded-2xl bg-white/[0.04] p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="font-medium">{row.name}</div><div className="mt-1 text-xs text-[#b8ad99]">{scopeLabel[row.scope]} · {controlLabel[row.controllability]} · {row.kind}</div></div><div className="grid grid-cols-3 gap-3 text-sm text-[#d9cfb8]"><span>עכשיו<br/><b className="text-[#f7f0df]">{money(row.spent)}</b></span><span>תחזית<br/><b className="text-[#f7f0df]">{money(row.projected)}</b></span><span>פער<br/><b className={row.variance > 0 ? "text-amber-100" : "text-emerald-100"}>{money(row.variance)}</b></span></div></div><p className="mt-3 text-sm leading-6 text-[#d9cfb8]">{row.decision}</p></div>;
}

function AccountRow({ item }: { item: CeoFinancePayload["accounts"][number] }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center justify-between gap-3"><div className="font-medium">{item.providerName} {item.accountLabel}</div><Badge variant={item.scope === "business" ? "default" : "secondary"}>{scopeLabel[item.scope]}</Badge></div><div className="mt-2 grid gap-2 text-sm text-[#d9cfb8] md:grid-cols-3"><span>הכנסות: {money(item.income)}</span><span>הוצאות: {money(item.expense)}</span><span>נטו: {money(item.net)}</span></div><div className="mt-1 text-xs text-[#b8ad99]">{item.count} תנועות · {item.from.slice(0,10)}–{item.to.slice(0,10)}</div></div>;
}

function BucketRow({ bucket }: { bucket: CeoFinancePayload["buckets"][number] }) {
  const tone = bucket.kind === "asset" ? "text-sky-200" : bucket.kind === "income" ? "text-emerald-200" : bucket.controllability === "review" ? "text-amber-100" : "text-[#f7f0df]";
  return <div className="rounded-2xl bg-white/[0.04] p-4"><div className="flex items-center justify-between gap-3"><div><div className="font-medium">{bucket.name}</div><div className="text-xs text-[#b8ad99]">{scopeLabel[bucket.scope]} · {bucket.count} תנועות · {controlLabel[bucket.controllability]}</div></div><div dir="ltr" className={`text-lg font-semibold ${tone}`}>{money(bucket.amount)}</div></div><p className="mt-2 text-sm leading-6 text-[#d9cfb8]">{bucket.note}</p>{bucket.topExamples.length > 0 && <div className="mt-2 text-xs text-[#b8ad99]">דוגמאות: {bucket.topExamples.join(" · ")}</div>}</div>;
}

function QualityRow({ item }: { item: CeoFinancePayload["dataQuality"][number] }) {
  const cls = item.severity === "action" ? "border-amber-300/30 bg-amber-300/10 text-amber-50" : item.severity === "warning" ? "border-red-300/30 bg-red-300/10 text-red-50" : "border-emerald-300/20 bg-emerald-300/10 text-emerald-50";
  return <div className={`rounded-2xl border p-4 text-sm leading-7 ${cls}`}>{item.text}</div>;
}

function MonthRow({ month }: { month: Record<string, number | string> }) {
  return <div className="grid gap-2 rounded-2xl bg-white/[0.04] p-3 text-sm md:grid-cols-4"><div className="font-medium">{String(month.month)}</div><div>עסקי נטו: {money(Number(month.businessIncome) - Number(month.businessExpense))}</div><div>פרטי נטו: {money(Number(month.personalIncome) - Number(month.personalExpense))}</div><div>נכסים/כרטיסים: {money(Number(month.investmentsAndFx) + Number(month.cardSettlements))}</div></div>;
}

function ConnectionRow({ item }: { item: Integration }) {
  const status = item.lastSyncAt ? "סונכרן" : "לא סונכרן";
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 font-medium"><Landmark size={17}/>{item.provider}</div><Badge variant={item.lastSyncAt ? "default" : "secondary"}>{status}</Badge></div><div className="mt-1 text-sm text-[#b8ad99]">סנכרון אחרון: {item.lastSyncAt ?? "עדיין לא רץ"} · {item.transactionCount} תנועות</div></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/15 p-4 text-[#b8ad99]">{text}</div>;
}
