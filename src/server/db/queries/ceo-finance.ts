import "server-only";

import { getDb } from "../index";
import { BANK_PROVIDERS } from "@/lib/types";

export type FinanceScope = "business" | "personal";
export type FinanceBucketKind = "income" | "expense" | "asset" | "transfer";

export interface CeoFinancePayload {
  month: string;
  monthLabel: string;
  coverage: { from: string | null; to: string | null; transactionCount: number };
  totals: {
    income: number;
    expense: number;
    net: number;
    businessIncome: number;
    businessExpense: number;
    businessNet: number;
    personalIncome: number;
    personalExpense: number;
    personalNet: number;
    investmentsAndFx: number;
    stockIncome: number;
    cardSettlements: number;
  };
  accounts: AccountSummary[];
  buckets: BucketSummary[];
  monthly: MonthlyScopeSummary[];
  opportunities: Opportunity[];
  dataQuality: DataQualityItem[];
}

export interface AccountSummary {
  provider: string;
  providerName: string;
  scope: FinanceScope;
  accountLabel: string;
  count: number;
  from: string;
  to: string;
  income: number;
  expense: number;
  net: number;
}

export interface BucketSummary {
  name: string;
  scope: FinanceScope;
  kind: FinanceBucketKind;
  controllability: "fixed" | "flexible" | "review" | "asset";
  amount: number;
  count: number;
  note: string;
  topExamples: string[];
}

export interface MonthlyScopeSummary {
  month: string;
  businessIncome: number;
  businessExpense: number;
  personalIncome: number;
  personalExpense: number;
  investmentsAndFx: number;
  cardSettlements: number;
}

export interface Opportunity {
  title: string;
  detail: string;
  monthlyImpact: number;
  annualImpact: number;
  scope: FinanceScope | "all";
}

export interface DataQualityItem {
  severity: "ok" | "warning" | "action";
  text: string;
}

interface TxRow {
  id: number;
  provider: string;
  account_number: string;
  date: string;
  charged_amount: number;
  description: string;
  memo: string | null;
}

function scopeForProvider(provider: string): FinanceScope {
  if (provider === "oneZero") return "business";
  return "personal";
}

function providerName(provider: string): string {
  return BANK_PROVIDERS.find((p) => p.id === provider)?.name ?? provider;
}

function monthFromDate(date: string): string {
  return date.slice(0, 7);
}

function redactedAccount(account: string): string {
  const suffix = String(account ?? "").replace(/\D/g, "").slice(-4);
  return suffix ? `…${suffix}` : "…";
}

function includesAny(text: string, needles: string[]) {
  return needles.some((n) => text.includes(n));
}

function classify(tx: TxRow): Omit<BucketSummary, "amount" | "count" | "topExamples"> {
  const text = `${tx.description} ${tx.memo ?? ""}`.toLowerCase();
  const scope = scopeForProvider(tx.provider);
  const amount = tx.charged_amount;

  if (amount > 0) {
    if (includesAny(text, ["משכורת", "salary", "hsbc", "בי\"ח", "בית חולים", "לניאד"])) {
      return { name: "שכר ומשכורות", scope, kind: "income", controllability: "fixed", note: "הכנסה שוטפת — לא לערבב עם מכירת מניות או העברות." };
    }
    if (includesAny(text, ["equatex", "זיכוי זה\"ב", "מניות", "ניירות", "ני\"ע"])) {
      return { name: "מניות / מימושים", scope, kind: "asset", controllability: "asset", note: "מימוש/פעילות השקעות — מוצג בנפרד מהכנסה חודשית." };
    }
    if (includesAny(text, ["אולסי", "מערכות", "apple", "העברה ממזרחי", "העברה מלאומי"])) {
      return { name: "הכנסות עסקיות / החזרים", scope: "business", kind: "income", controllability: "fixed", note: "הכנסות או החזרים בחשבון העסקי." };
    }
    if (includesAny(text, ["ביטוח לאומי", "ילדים"])) {
      return { name: "קצבאות / החזרים משפחתיים", scope: "personal", kind: "income", controllability: "fixed", note: "הכנסה משפחתית חוזרת." };
    }
    if (includesAny(text, ["העברה מדור", "ביט משיכה", "הפקדת שיק", "העברה מאבידן"])) {
      return { name: "העברות פנימיות / משפחה", scope, kind: "transfer", controllability: "review", note: "לא הכנסה אמיתית עד שמסווגים מקור/יעד." };
    }
    return { name: scope === "business" ? "הכנסה עסקית לבדיקה" : "הכנסה פרטית לבדיקה", scope, kind: "income", controllability: "review", note: "צריך לאשר אם זו הכנסה אמיתית או העברה." };
  }

  if (includesAny(text, ["רכישת מטח", "עמלה בני\"ע", "ניירות", "ני\"ע", "מיקרון", "אינטל", "סופר מיקרו", "micron", "עמלת חליפין", "מטח", "מט\""])) {
    return { name: "מניות / מט״ח / השקעות", scope, kind: "asset", controllability: "asset", note: "פעילות השקעות והמרות — לא הוצאה שוטפת." };
  }
  if (includesAny(text, ["משכנתא"])) {
    return { name: "משכנתא ודיור קבוע", scope: "personal", kind: "expense", controllability: "fixed", note: "קבוע/קשיח — לא יעד ראשון לחיסכון חודשי." };
  }
  if (includesAny(text, ["כ.א.ל", "כאל", "ישראכרט", "מקס", "ויזה", "כרטיס", "דיירקט", "מכאל", "ממקס"])) {
    return { name: "חיובי כרטיסים — פירוט חסר", scope, kind: "expense", controllability: "review", note: "זה חיוב מרוכז. צריך לחבר/להביא פירוט כרטיס או חשבוניות כדי לדעת לאן הלך הכסף." };
  }
  if (includesAny(text, ["בית חב", "חב\"ד", "תרומה", "נווה שלום"])) {
    return { name: "תרומות", scope: "personal", kind: "expense", controllability: "flexible", note: "קטגוריה נשלטת — אפשר לקבוע תקרה חודשית." };
  }
  if (includesAny(text, ["שיק", "הע. ל", "הו\"ק", "העברה ל"])) {
    return { name: "העברות / שיקים לאנשים", scope, kind: "expense", controllability: "review", note: "צריך לוודא אם עסקי/פרטי ומה מטרת התשלום." };
  }
  if (includesAny(text, ["דמי מנוי", "one"])) {
    return { name: "עמלות ומנויים בנקאיים", scope, kind: "expense", controllability: "flexible", note: "עלות שירותים/מנויים — לבדיקה וחיסכון קטן." };
  }
  if (includesAny(text, ["עמלה", "ריבית", "אשראי", "מס", "בנק"])) {
    return { name: "עמלות וריביות", scope, kind: "expense", controllability: "flexible", note: "עמלות/ריביות — לבדוק הפחתה או מסלול." };
  }
  return { name: scope === "business" ? "עסקי — לא מסווג" : "פרטי — לא מסווג", scope, kind: "expense", controllability: "review", note: "דורש קטגוריזציה/חשבונית." };
}

export function getCeoFinance(workspaceId: number): CeoFinancePayload {
  const db = getDb();
  const coverage = db.prepare(
    `SELECT MIN(date) as fromDate, MAX(date) as toDate, COUNT(*) as count
     FROM transactions WHERE workspace_id = ? AND status = 'completed'`
  ).get(workspaceId) as { fromDate: string | null; toDate: string | null; count: number };
  const month = coverage.toDate ? monthFromDate(coverage.toDate) : new Date().toISOString().slice(0, 7);
  const rows = db.prepare(
    `SELECT id, provider, account_number, date, charged_amount, description, memo
     FROM transactions
     WHERE workspace_id = ? AND status = 'completed' AND substr(date, 1, 7) = ?
     ORDER BY date DESC, id DESC`
  ).all(workspaceId, month) as TxRow[];
  const allRows = db.prepare(
    `SELECT id, provider, account_number, date, charged_amount, description, memo
     FROM transactions
     WHERE workspace_id = ? AND status = 'completed'
     ORDER BY date DESC, id DESC`
  ).all(workspaceId) as TxRow[];

  const accountsMap = new Map<string, AccountSummary>();
  for (const tx of allRows) {
    const key = `${tx.provider}:${tx.account_number}`;
    const existing = accountsMap.get(key) ?? {
      provider: tx.provider,
      providerName: providerName(tx.provider),
      scope: scopeForProvider(tx.provider),
      accountLabel: redactedAccount(tx.account_number),
      count: 0,
      from: tx.date,
      to: tx.date,
      income: 0,
      expense: 0,
      net: 0,
    };
    existing.count += 1;
    existing.from = existing.from < tx.date ? existing.from : tx.date;
    existing.to = existing.to > tx.date ? existing.to : tx.date;
    if (tx.charged_amount > 0) existing.income += tx.charged_amount;
    else existing.expense += Math.abs(tx.charged_amount);
    existing.net += tx.charged_amount;
    accountsMap.set(key, existing);
  }

  const bucketsMap = new Map<string, BucketSummary>();
  for (const tx of rows) {
    const base = classify(tx);
    const key = `${base.scope}:${base.kind}:${base.name}`;
    const b = bucketsMap.get(key) ?? { ...base, amount: 0, count: 0, topExamples: [] };
    b.amount += Math.abs(tx.charged_amount);
    b.count += 1;
    if (b.topExamples.length < 3 && !b.topExamples.includes(tx.description)) b.topExamples.push(tx.description);
    bucketsMap.set(key, b);
  }
  const buckets = Array.from(bucketsMap.values()).sort((a, b) => b.amount - a.amount);

  const monthlyMap = new Map<string, MonthlyScopeSummary>();
  for (const tx of allRows) {
    const m = monthFromDate(tx.date);
    const s = monthlyMap.get(m) ?? { month: m, businessIncome: 0, businessExpense: 0, personalIncome: 0, personalExpense: 0, investmentsAndFx: 0, cardSettlements: 0 };
    const c = classify(tx);
    if (c.name.includes("כרטיסים")) s.cardSettlements += Math.abs(tx.charged_amount);
    if (c.kind === "asset") s.investmentsAndFx += Math.abs(tx.charged_amount);
    if (c.kind === "income") {
      if (c.scope === "business") s.businessIncome += tx.charged_amount;
      else s.personalIncome += tx.charged_amount;
    } else if (c.kind === "expense") {
      if (c.scope === "business") s.businessExpense += Math.abs(tx.charged_amount);
      else s.personalExpense += Math.abs(tx.charged_amount);
    }
    monthlyMap.set(m, s);
  }

  const sum = (pred: (b: BucketSummary) => boolean) => buckets.filter(pred).reduce((a, b) => a + b.amount, 0);
  const businessIncome = sum((b) => b.scope === "business" && b.kind === "income");
  const businessExpense = sum((b) => b.scope === "business" && b.kind === "expense");
  const personalIncome = sum((b) => b.scope === "personal" && b.kind === "income");
  const personalExpense = sum((b) => b.scope === "personal" && b.kind === "expense");
  const investmentsAndFx = sum((b) => b.kind === "asset");
  const stockIncome = sum((b) => b.name.includes("מניות") && b.kind === "asset" && b.scope === "personal");
  const cardSettlements = sum((b) => b.name.includes("כרטיסים"));
  const income = businessIncome + personalIncome;
  const expense = businessExpense + personalExpense;

  const reviewCard = buckets.find((b) => b.name.includes("כרטיסים"));
  const flexible = buckets.filter((b) => b.kind === "expense" && ["flexible", "review"].includes(b.controllability) && !b.name.includes("כרטיסים"));
  const biggestFlexible = flexible[0];
  const opportunities: Opportunity[] = [];
  if (reviewCard) opportunities.push({
    title: "לפרק את חיובי הכרטיסים",
    detail: `יש ${formatIls(reviewCard.amount)} בחיובים מרוכזים החודש. בלי פירוט כרטיס/חשבוניות אי אפשר לדעת באמת איפה לחסוך.`,
    monthlyImpact: Math.round(reviewCard.amount * 0.08),
    annualImpact: Math.round(reviewCard.amount * 0.08 * 12),
    scope: reviewCard.scope,
  });
  if (biggestFlexible) opportunities.push({
    title: `לקבוע תקרה ל-${biggestFlexible.name}`,
    detail: `יעד ראשון ריאלי: הורדה של 10% מהקטגוריה החודשית בלי לגעת במשכנתא/השקעות.`,
    monthlyImpact: Math.round(biggestFlexible.amount * 0.1),
    annualImpact: Math.round(biggestFlexible.amount * 0.1 * 12),
    scope: biggestFlexible.scope,
  });
  opportunities.push({
    title: "להפריד מניות מתזרים",
    detail: "פעילות מט״ח/ניירות ערך מוצגת כנכס/השקעה, לא כהוצאה שוטפת — זה מונע החלטות שגויות על החודש.",
    monthlyImpact: 0,
    annualImpact: 0,
    scope: "all",
  });

  const dataQuality: DataQualityItem[] = [
    { severity: "ok", text: "One Zero מסומן כעסקי; Mercantile מסומן כפרטי לפי ההנחיה שלך." },
    { severity: cardSettlements > 0 ? "action" : "ok", text: cardSettlements > 0 ? "חיובי כרטיסים עדיין מרוכזים — צריך פירוט כרטיסים/חשבוניות כדי לדעת ספקים אמיתיים." : "אין חיובי כרטיסים מרוכזים בחודש הנבחר." },
    { severity: investmentsAndFx > 0 ? "ok" : "warning", text: investmentsAndFx > 0 ? "פעילות מניות/מט״ח מופרדת מהוצאות רגילות." : "לא זוהתה פעילות מניות/מט״ח בחודש הנבחר." },
  ];

  return {
    month,
    monthLabel: new Date(`${month}-01T00:00:00`).toLocaleDateString("he-IL", { month: "long", year: "numeric" }),
    coverage: { from: coverage.fromDate, to: coverage.toDate, transactionCount: coverage.count },
    totals: {
      income,
      expense,
      net: income - expense,
      businessIncome,
      businessExpense,
      businessNet: businessIncome - businessExpense,
      personalIncome,
      personalExpense,
      personalNet: personalIncome - personalExpense,
      investmentsAndFx,
      stockIncome,
      cardSettlements,
    },
    accounts: Array.from(accountsMap.values()).sort(
      (a, b) => a.scope.localeCompare(b.scope) || b.count - a.count
    ),
    buckets,
    monthly: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
    opportunities,
    dataQuality,
  };
}

function formatIls(value: number): string {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(value);
}
