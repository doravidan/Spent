"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  BriefcaseBusiness,
  CreditCard,
  FileText,
  Gauge,
  Landmark,
  Link2,
  Mail,
  PiggyBank,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getHome,
  getSetupStatus,
  listIntegrations,
  startSync,
  type SyncProgressEvent,
} from "@/lib/api";
import type { HomePayload, Integration, SetupStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const currency = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});
const percent = new Intl.NumberFormat("he-IL", {
  style: "percent",
  maximumFractionDigits: 0,
});

const businessUnits = [
  { name: "EdenOS", hint: "AI ops / runtime / secure gateway" },
  { name: "TaskClo", hint: "iOS + web product pipeline" },
  { name: "Style My Look", hint: "fashion AI / TestFlight / App Store" },
  { name: "TripWeaver", hint: "travel planning product" },
  { name: "GEM", hint: "media / player / experiments" },
  { name: "Personal", hint: "home, family, private cashflow" },
];

export function CeoLivePage() {
  const queryClient = useQueryClient();
  const home = useQuery({ queryKey: ["home"], queryFn: getHome, refetchInterval: 60_000 });
  const integrations = useQuery({
    queryKey: ["integrations"],
    queryFn: listIntegrations,
    refetchInterval: 60_000,
  });
  const setup = useQuery({ queryKey: ["setup-status"], queryFn: getSetupStatus });

  const data = home.data;
  const model = useMemo(() => buildModel(data, integrations.data, setup.data), [data, integrations.data, setup.data]);

  const handleSync = () => {
    const sync = startSync(undefined, (event: SyncProgressEvent) => {
      if (["complete", "error", "provider-done"].includes(event.type)) {
        queryClient.invalidateQueries({ queryKey: ["home"] });
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
                <ShieldCheck size={16} /> Live local bank/card sync · encrypted SQLite · Hermes CEO layer
              </div>
              <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">כסף לייב — לא אקסל</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[#d9cfb8]">
                זה פורק אמיתי של Spent: ההתחברות לבנקים ולחברות האשראי נשארת מהמנוע המקורי, והמסך הזה יושב מעל הנתונים החיים כדי להראות תזרים, חריגות, חשבוניות חסרות והחלטת CEO יומית.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/25 p-5 text-sm text-[#d9cfb8]">
              <div className="mb-3 flex items-center gap-2 text-[#f7f0df]"><Bot size={18}/> מצב Hermes</div>
              <p>{model.hasBank ? "מחובר לנתוני Spent. Hermes יכול להפוך חריגות למשימות והחלטות." : "עדיין אין חשבון מחובר. חבר בנק/אשראי דרך Setup כדי לראות נתוני אמת."}</p>
              <div className="mt-4 flex gap-2">
                <Link href="/setup" className="inline-flex h-8 items-center justify-center rounded-md bg-secondary px-3 text-xs font-medium text-secondary-foreground hover:bg-secondary/80">חיבור חשבון</Link>
                <Button size="sm" onClick={handleSync}><RefreshCw className="ml-2 h-4 w-4"/>סנכרון עכשיו</Button>
              </div>
            </div>
          </div>
        </section>

        {!model.hasBank && <SetupCallout setup={setup.data} />}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Kpi label="הכנסות החודש" value={model.income} icon={ArrowUpRight} tone="good" detail="מגיע מהבנק אחרי חיבור" />
          <Kpi label="הוצאות החודש" value={-model.expenses} icon={CreditCard} tone="warn" detail="לא כולל transfers פנימיים" />
          <Kpi label="נטו חי" value={model.net} icon={PiggyBank} tone={model.net >= 0 ? "good" : "bad"} detail="הכנסות פחות הוצאות" />
          <Kpi label="דורש טיפול" valueText={String(model.attention)} icon={ReceiptText} tone={model.attention > 0 ? "bad" : "good"} detail="לא מקוטלג / confidence נמוך / flagged" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <Card title="סיפור החודש" icon={Gauge}>
            <div className="grid gap-4 md:grid-cols-3">
              <Metric label="עבר מהחודש" value={percent.format(model.elapsed / 100)} note="משמש רק להוצאות גמישות" />
              <Metric label="תקציב חודשי" value={currency.format(model.budget)} note={model.budget > 0 ? "מוגדר ב-Spent" : "עדיין לא הוגדר"} />
              <Metric label="תחזית סוף חודש" value={currency.format(model.projectedExpense)} note="מודל ראשוני: הוצאות קיימות + קצב גמיש" />
            </div>
            <DecisionCard model={model} />
          </Card>

          <Card title="חיבורי בנקים ואשראי" icon={Link2}>
            <div className="space-y-3">
              {(integrations.data?.length ? integrations.data : []).map((item) => <ConnectionRow key={item.provider} item={item} />)}
              {!integrations.data?.length && (
                <div className="rounded-3xl border border-dashed border-white/20 bg-white/[0.03] p-5 text-[#d9cfb8]">
                  אין עדיין חיבורים. המנוע תומך בבנקים/אשראי ישראליים דרך `israeli-bank-scrapers` — חבר דרך Setup, לא דרך צ׳אט.
                </div>
              )}
            </div>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <Card title="חשבוניות מול חיובים" icon={FileText} compact>
            <p className="text-[#d9cfb8]">השלב הבא: חיבור מייל/חשבוניות PDF והתאמה אוטומטית מול חיובי אשראי לפי סכום, תאריך, ספק ומע״מ.</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-amber-100"><Mail size={16}/> מוכן לסקופ הבא: Gmail/IMAP read-only.</div>
          </Card>
          <Card title="יחידות עסקיות" icon={BriefcaseBusiness} compact>
            <div className="grid gap-2">
              {businessUnits.map((unit) => <div key={unit.name} className="rounded-2xl bg-white/[0.04] p-3"><div className="font-medium">{unit.name}</div><div className="text-sm text-[#b8ad99]">{unit.hint}</div></div>)}
            </div>
          </Card>
          <Card title="Paperclip / CEO loop" icon={Target} compact>
            <ol className="space-y-3 text-[#d9cfb8]">
              <li>1. סנכרון בנק/אשראי מקומי.</li>
              <li>2. זיהוי חריגה/חשבונית חסרה.</li>
              <li>3. Hermes פותח משימה ב-Paperclip.</li>
              <li>4. דיווח רק על שינוי מצב או החלטה.</li>
            </ol>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <Card title="Top merchants live" icon={WalletCards}>
            <div className="space-y-3">
              {data?.topMerchants?.length ? data.topMerchants.map((m) => (
                <div key={m.name} className="flex items-center justify-between rounded-2xl bg-white/[0.04] p-3">
                  <span>{m.name}</span><span dir="ltr">{currency.format(m.total)}</span>
                </div>
              )) : <Empty text="יופיע אחרי סנכרון ראשון." />}
            </div>
          </Card>
          <Card title="תנועות אחרונות" icon={Activity}>
            <div className="space-y-3">
              {data?.recentTransactions?.length ? data.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.04] p-3">
                  <div><div className="font-medium">{tx.description}</div><div className="text-sm text-[#b8ad99]">{tx.date} · {tx.categoryName ?? "לא מקוטלג"}</div></div>
                  <span dir="ltr" className={tx.kind === "income" ? "text-emerald-200" : "text-[#f7f0df]"}>{currency.format(tx.chargedAmount)}</span>
                </div>
              )) : <Empty text="אין תנועות עדיין — חבר חשבון והרץ Sync." />}
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}

function buildModel(data?: HomePayload, integrations?: Integration[], setup?: SetupStatus) {
  const income = data?.cashFlow?.income ?? 0;
  const expenses = data?.cashFlow?.expenses ?? 0;
  const net = data?.cashFlow?.net ?? 0;
  const budget = data?.thisMonth?.budget ?? 0;
  const elapsed = data?.thisMonth?.timeElapsedPercent ?? 0;
  const attention = (data?.needsAttention?.uncategorized ?? 0) + (data?.needsAttention?.lowConfidence ?? 0) + (data?.needsAttention?.flagged ?? 0);
  const projectedExpense = elapsed > 0 ? Math.round(expenses / Math.max(elapsed / 100, 0.1)) : expenses;
  return { income, expenses, net, budget, elapsed, attention, projectedExpense, hasBank: Boolean(setup?.hasBankCredentials || integrations?.length) };
}

function SetupCallout({ setup }: { setup?: SetupStatus }) {
  return (
    <section className="rounded-[2rem] border border-amber-300/20 bg-amber-300/10 p-5 text-amber-50">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-lg font-semibold"><AlertTriangle size={20}/> צריך חיבור חשבון אמיתי</div>
          <p className="text-amber-100/90">לא שולחים סיסמאות בצ׳אט. פותחים Setup מקומית, מזינים credentials במחשב שלך, והם נשמרים מוצפנים.</p>
        </div>
        <Link href="/setup" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">פתח Setup</Link>
      </div>
      {setup && <div className="mt-3 text-sm text-amber-100/80">AI provider: {setup.hasAIProvider ? "מחובר" : "לא מחובר"}</div>}
    </section>
  );
}

function DecisionCard({ model }: { model: ReturnType<typeof buildModel> }) {
  const overBudget = model.budget > 0 && model.projectedExpense > model.budget;
  const gap = Math.max(0, model.projectedExpense - model.budget);
  return (
    <div className="mt-6 rounded-3xl bg-[#f2d28b]/10 p-5">
      <div className="mb-2 flex items-center gap-2 text-[#f2d28b]"><Sparkles size={18}/> Decision #1</div>
      <p className="text-xl font-medium">
        {!model.hasBank ? "חבר חשבון אחד כדי לקבל החלטת CEO אמיתית לפי תנועות חיות." : overBudget ? `צריך להוריד ${currency.format(gap)} מהוצאות גמישות כדי לסיים במסגרת.` : "כרגע אין חריגה צפויה מהתקציב — המשימה היא להשלים קטגוריזציה וחשבוניות."}
      </p>
    </div>
  );
}

function Kpi({ label, value, valueText, detail, icon: Icon, tone }: { label: string; value?: number; valueText?: string; detail: string; icon: LucideIcon; tone: "good" | "warn" | "bad" }) {
  const colors = tone === "good" ? "text-emerald-200 bg-emerald-300/10" : tone === "bad" ? "text-red-200 bg-red-300/10" : "text-amber-200 bg-amber-300/10";
  return <div className="rounded-3xl border border-white/10 bg-[#111922] p-5 shadow-xl"><div className={`mb-4 inline-flex rounded-2xl p-3 ${colors}`}><Icon size={22}/></div><div className="text-sm text-[#b8ad99]">{label}</div><div dir="ltr" className="mt-2 text-right text-3xl font-semibold">{valueText ?? currency.format(value ?? 0)}</div><div className="mt-2 text-sm text-[#d9cfb8]">{detail}</div></div>;
}

function Card({ title, icon: Icon, children, compact = false }: { title: string; icon: LucideIcon; children: React.ReactNode; compact?: boolean }) {
  return <section className={`rounded-[2rem] border border-white/10 bg-[#111922] shadow-xl ${compact ? "p-5" : "p-6"}`}><h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold"><Icon size={22}/>{title}</h2>{children}</section>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-3xl border border-white/10 bg-black/20 p-4"><div className="text-sm text-[#b8ad99]">{label}</div><div dir="ltr" className="mt-2 text-right text-2xl font-semibold">{value}</div><div className="mt-2 text-sm text-[#d9cfb8]">{note}</div></div>;
}

function ConnectionRow({ item }: { item: Integration }) {
  const status = item.lastSyncAt ? "synced" : "never synced";
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 font-medium"><Landmark size={17}/>{item.provider}</div><Badge variant={item.lastSyncAt ? "default" : "secondary"}>{status}</Badge></div><div className="mt-1 text-sm text-[#b8ad99]">סנכרון אחרון: {item.lastSyncAt ?? "עדיין לא רץ"} · {item.transactionCount} תנועות</div>{item.requiresManualTwoFactor && <div className="mt-2 text-sm text-amber-100">מוגדר עם 2FA ידני / חלון דפדפן בזמן סנכרון</div>}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/15 p-4 text-[#b8ad99]">{text}</div>;
}
