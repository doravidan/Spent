import "server-only";

import { getDb } from "../index";
import { BANK_PROVIDERS } from "@/lib/types";

export type FinanceScope = "business" | "personal";
export type FinanceBucketKind = "income" | "expense" | "asset" | "transfer";
export type Controllability = "fixed" | "flexible" | "review" | "asset";

export interface CeoFinancePayload {
  month: string;
  monthLabel: string;
  coverage: { from: string | null; to: string | null; transactionCount: number };
  monthProgress: { day: number; daysInMonth: number; ratio: number; remainingDays: number };
  health: { score: number; label: string; tone: "good" | "warn" | "bad"; reason: string };
  story: string;
  decision: DecisionCard;
  totals: {
    income: number;
    expense: number;
    livingExpense: number;
    regularIncome: number;
    businessIncome: number;
    businessExpense: number;
    businessNet: number;
    personalIncome: number;
    personalExpense: number;
    personalNet: number;
    net: number;
    projectedLivingExpense: number;
    projectedNet: number;
    fixedExpense: number;
    flexibleExpense: number;
    reviewExpense: number;
    investmentsAndFx: number;
    stockIncome: number;
    cardSettlements: number;
    transfers: number;
  };
  accounts: AccountSummary[];
  buckets: BucketSummary[];
  smartBudget: SmartBudgetRow[];
  monthly: MonthlyScopeSummary[];
  opportunities: Opportunity[];
  weeklyCoach: CoachAction[];
  savingsScenarios: SavingsScenario[];
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
  controllability: Controllability;
  amount: number;
  projectedAmount: number;
  baseline: number;
  variance: number;
  count: number;
  note: string;
  topExamples: string[];
}

export interface SmartBudgetRow {
  name: string;
  scope: FinanceScope;
  kind: FinanceBucketKind;
  controllability: Controllability;
  spent: number;
  projected: number;
  baseline: number;
  variance: number;
  decision: string;
}

export interface MonthlyScopeSummary {
  month: string;
  businessIncome: number;
  businessExpense: number;
  personalIncome: number;
  personalExpense: number;
  livingExpense: number;
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

export interface DecisionCard extends Opportunity {
  urgency: "low" | "medium" | "high";
  why: string;
}

export interface CoachAction {
  title: string;
  detail: string;
  amount: number;
  checked: boolean;
}

export interface SavingsScenario {
  label: string;
  monthly: number;
  quarterly: number;
  annual: number;
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

function parseTransactionDate(date: string): Date {
  return new Date(date.includes("T") ? date : `${date}T00:00:00`);
}

function addOneMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

function isPersonalSalary(tx: TxRow): boolean {
  const text = `${tx.description} ${tx.memo ?? ""}`.toLowerCase();
  return tx.charged_amount > 0 && scopeForProvider(tx.provider) === "personal" && includesAny(text, ["משכורת", "salary", "hsbc", "בי\"ח", "בית חולים", "לניאד"]);
}

function accountingMonthForTx(tx: TxRow): string {
  const month = monthFromDate(tx.date);
  const day = parseTransactionDate(tx.date).getUTCDate();
  if (isPersonalSalary(tx) && day >= 25) return addOneMonth(month);
  return month;
}

function redactedAccount(account: string): string {
  const suffix = String(account ?? "").replace(/\D/g, "").slice(-4);
  return suffix ? `…${suffix}` : "…";
}

function includesAny(text: string, needles: string[]) {
  return needles.some((n) => text.includes(n));
}

function detailedCardBucket(text: string, scope: FinanceScope): Omit<BucketSummary, "amount" | "projectedAmount" | "baseline" | "variance" | "count" | "topExamples"> | null {
  if (includesAny(text, ["אושר עד", "פרש מרקט", "בר כל טוב", "הקצבים", "מאפיית", "ממתקים", "סיבוס"])) {
    return { name: "מזון וסופר", scope, kind: "expense", controllability: "flexible", note: "פירוט כרטיס קיים — קניות מזון/סופר." };
  }
  if (includesAny(text, ["spotify", "netflix", "ionos", "וויקום", "wecom"])) {
    return { name: "מנויים ותקשורת", scope, kind: "expense", controllability: "flexible", note: "מנויים/תקשורת שניתן לבדוק ולצמצם." };
  }
  if (includesAny(text, ["amazon", "alipay", "swappedcom", "ארכה", "פוליצר", "בוה"])) {
    return { name: "קניות וציוד", scope, kind: "expense", controllability: "flexible", note: "קניות/ציוד — יעד טוב לבדיקה לפי צורך." };
  }
  if (includesAny(text, ["מי חדרה", "חשמל", "ארנונה", "גז "])) {
    return { name: "חשבונות בית", scope, kind: "expense", controllability: "fixed", note: "חשבון בית/תשתית — קשיח יחסית." };
  }
  if (includesAny(text, ["איילון", "ביטוח"])) {
    return { name: "ביטוחים ובריאות", scope, kind: "expense", controllability: "fixed", note: "ביטוח/בריאות — לבדוק כפילויות, לא לחתוך בלי בדיקה." };
  }
  if (includesAny(text, ["צמיגים", "דלק", "חניה", "כביש 6"])) {
    return { name: "רכב ותחבורה", scope, kind: "expense", controllability: "flexible", note: "רכב/תחבורה — לבדוק חריגות." };
  }
  if (includesAny(text, ["חבד", "חב\"ד", "יודיאקה", "אהבת ישראל", "דבר מלכות", "התורה והארץ"])) {
    return { name: "תרומות וקהילה", scope, kind: "expense", controllability: "flexible", note: "תרומות/קהילה — לקבוע תקרה חודשית אם צריך." };
  }
  return null;
}

function classify(tx: TxRow): Omit<BucketSummary, "amount" | "projectedAmount" | "baseline" | "variance" | "count" | "topExamples"> {
  const text = `${tx.description} ${tx.memo ?? ""}`.toLowerCase();
  const scope = scopeForProvider(tx.provider);
  const amount = tx.charged_amount;

  if (amount > 0) {
    if (includesAny(text, ["משכורת", "salary", "hsbc", "בי\"ח", "בית חולים", "לניאד"])) return { name: "שכר ומשכורות", scope, kind: "income", controllability: "fixed", note: "הכנסה שוטפת — בסיס התזרים החודשי." };
    if (includesAny(text, ["equatex", "זיכוי זה\"ב", "מניות", "ניירות", "ני\"ע"])) return { name: "מניות / מימושים", scope, kind: "asset", controllability: "asset", note: "מימוש/פעילות השקעות — לא הכנסה שוטפת." };
    if (includesAny(text, ["אולסי", "מערכות", "apple", "העברה ממזרחי", "העברה מלאומי"])) return { name: "הכנסות עסקיות / החזרים", scope: "business", kind: "income", controllability: "fixed", note: "הכנסות או החזרים בחשבון העסקי." };
    if (includesAny(text, ["ביטוח לאומי", "ילדים"])) return { name: "קצבאות / החזרים משפחתיים", scope: "personal", kind: "income", controllability: "fixed", note: "הכנסה משפחתית חוזרת." };
    if (includesAny(text, ["העברה מדור", "ביט משיכה", "הפקדת שיק", "העברה מאבידן"])) return { name: "העברות פנימיות / משפחה", scope, kind: "transfer", controllability: "review", note: "לא הכנסה אמיתית עד שמסווגים מקור/יעד." };
    return { name: scope === "business" ? "הכנסה עסקית לבדיקה" : "הכנסה פרטית לבדיקה", scope, kind: "income", controllability: "review", note: "צריך לאשר אם זו הכנסה אמיתית או העברה." };
  }

  if (includesAny(text, ["רכישת מטח", "עמלה בני\"ע", "ניירות", "ני\"ע", "מיקרון", "אינטל", "סופר מיקרו", "micron", "עמלת חליפין", "מטח", "מט\""])) return { name: "מניות / מט״ח / השקעות", scope, kind: "asset", controllability: "asset", note: "פעילות השקעות והמרות — מחוץ להוצאות מחיה." };
  if (includesAny(text, ["משכנתא"])) return { name: "משכנתא ודיור קבוע", scope: "personal", kind: "expense", controllability: "fixed", note: "קבוע/קשיח — לא מכפילים בתחזית אמצע חודש." };
  const cardDetail = detailedCardBucket(text, scope);
  if (cardDetail) return cardDetail;
  if (includesAny(text, ["כ.א.ל", "כאל", "חיוב לכרטיס ויזה", "מכאל"])) return { name: "תשלום כרטיס אשראי — כאל/ויזה", scope, kind: "transfer", controllability: "review", note: "סילוק כרטיס מהבנק. הפירוט מגיע מעסקאות כאל ולכן לא נספר כהוצאה נוספת." };
  if (includesAny(text, ["ישראכרט", "מקס", "דיירקט", "ממקס"])) return { name: "כרטיסים שעדיין בלי פירוט ספקים", scope, kind: "expense", controllability: "review", note: "חיוב מרוכז ללא עסקאות ספק מפורקות במערכת. צריך לחבר או לייבא פירוט כרטיס." };
  if (includesAny(text, ["בית חב", "חב\"ד", "תרומה", "נווה שלום"])) return { name: "תרומות", scope: "personal", kind: "expense", controllability: "flexible", note: "נשלט — אפשר לקבוע תקרה שבועית/חודשית." };
  if (includesAny(text, ["שיק", "הע. ל", "הו\"ק", "העברה ל"])) return { name: "העברות / שיקים לאנשים", scope, kind: "expense", controllability: "review", note: "צריך לוודא עסקי/פרטי ומה מטרת התשלום." };
  if (includesAny(text, ["דמי מנוי", "one"])) return { name: "עמלות ומנויים בנקאיים", scope, kind: "expense", controllability: "flexible", note: "עלות שירות/מנוי — לבדיקה וחיסכון קטן." };
  if (includesAny(text, ["עמלה", "ריבית", "אשראי", "מס", "בנק"])) return { name: "עמלות וריביות", scope, kind: "expense", controllability: "flexible", note: "עמלות/ריביות — לבדוק הפחתה או מסלול." };
  return { name: scope === "business" ? "עסקי — לא מסווג" : "פרטי — לא מסווג", scope, kind: "expense", controllability: "review", note: "דורש קטגוריזציה/חשבונית." };
}

function monthProgress(month: string) {
  const now = new Date();
  const current = now.toISOString().slice(0, 7);
  const [year, m] = month.split("-").map(Number);
  const daysInMonth = new Date(year, m, 0).getDate();
  const day = current === month ? Math.min(now.getDate(), daysInMonth) : daysInMonth;
  const ratio = Math.max(0.05, Math.min(1, day / daysInMonth));
  return { day, daysInMonth, ratio, remainingDays: Math.max(0, daysInMonth - day) };
}

function blankMonthly(month: string): MonthlyScopeSummary {
  return { month, businessIncome: 0, businessExpense: 0, personalIncome: 0, personalExpense: 0, livingExpense: 0, investmentsAndFx: 0, cardSettlements: 0 };
}

function forecastBucket(b: BucketSummary, progressRatio: number): number {
  if (b.kind !== "expense") return b.amount;
  if (b.controllability === "fixed" || b.controllability === "asset") return b.amount;
  if (b.controllability === "review" && !b.name.includes("כרטיסים")) return b.amount;
  return Math.max(b.amount, Math.round(b.amount / progressRatio));
}

function decisionFor(row: SmartBudgetRow): string {
  if (row.kind === "asset") return "להשאיר מחוץ לתזרים — זה נכס/השקעה, לא הוצאה שוטפת.";
  if (row.kind === "income") return "לעקוב כהכנסה אמיתית; לא לערבב עם העברות פנימיות.";
  if (row.name.includes("כרטיסים")) return "החלטה: לחבר/לייבא את פירוט הכרטיס הזה כדי להפוך חיוב מרוכז לספקים אמיתיים.";
  if (row.controllability === "fixed") return "קבוע/קשיח: לעקוב, לא להפוך להחלטת חיסכון שבועית.";
  if (row.controllability === "review") return "קודם לפרק ולסווג — לא להניח שזה חיסכון זמין עד שיודעים מה זה.";
  if (row.variance > 0) return `לשים תקרה לשבוע הקרוב: לקצץ בערך ${formatIls(Math.max(row.variance * 0.25, row.spent * 0.08))}.`;
  return "בשליטה כרגע — להמשיך לעקוב.";
}

export function getCeoFinance(workspaceId: number): CeoFinancePayload {
  const db = getDb();
  const coverage = db.prepare(
    `SELECT MIN(date) as fromDate, MAX(date) as toDate, COUNT(*) as count
     FROM transactions WHERE workspace_id = ? AND status = 'completed'`
  ).get(workspaceId) as { fromDate: string | null; toDate: string | null; count: number };
  const allRows = db.prepare(
    `SELECT id, provider, account_number, date, charged_amount, description, memo
     FROM transactions
     WHERE workspace_id = ? AND status = 'completed'
     ORDER BY date DESC, id DESC`
  ).all(workspaceId) as TxRow[];

  const accountingMonths = allRows.map(accountingMonthForTx).sort();
  const month = accountingMonths.length > 0 ? accountingMonths[accountingMonths.length - 1] : new Date().toISOString().slice(0, 7);
  const progress = monthProgress(month);
  const rows = allRows.filter((tx) => accountingMonthForTx(tx) === month);

  const accountsMap = new Map<string, AccountSummary>();
  for (const tx of allRows) {
    const key = `${tx.provider}:${tx.account_number}`;
    const existing = accountsMap.get(key) ?? { provider: tx.provider, providerName: providerName(tx.provider), scope: scopeForProvider(tx.provider), accountLabel: redactedAccount(tx.account_number), count: 0, from: tx.date, to: tx.date, income: 0, expense: 0, net: 0 };
    existing.count += 1;
    existing.from = existing.from < tx.date ? existing.from : tx.date;
    existing.to = existing.to > tx.date ? existing.to : tx.date;
    const movement = classify(tx);
    if (movement.kind === "income") existing.income += tx.charged_amount;
    if (movement.kind === "expense") existing.expense += Math.abs(tx.charged_amount);
    if (movement.kind === "income" || movement.kind === "expense") existing.net += tx.charged_amount;
    accountsMap.set(key, existing);
  }

  const historicalBuckets = new Map<string, { amount: number; months: Set<string> }>();
  for (const tx of allRows) {
    const txMonth = accountingMonthForTx(tx);
    if (txMonth >= month) continue;
    const c = classify(tx);
    const key = `${c.scope}:${c.kind}:${c.name}`;
    const h = historicalBuckets.get(key) ?? { amount: 0, months: new Set<string>() };
    h.amount += Math.abs(tx.charged_amount);
    h.months.add(txMonth);
    historicalBuckets.set(key, h);
  }

  const bucketsMap = new Map<string, BucketSummary>();
  for (const tx of rows) {
    const base = classify(tx);
    const key = `${base.scope}:${base.kind}:${base.name}`;
    const h = historicalBuckets.get(key);
    const baseline = h && h.months.size > 0 ? Math.round(h.amount / Math.min(3, h.months.size)) : 0;
    const b = bucketsMap.get(key) ?? { ...base, amount: 0, projectedAmount: 0, baseline, variance: 0, count: 0, topExamples: [] };
    b.amount += Math.abs(tx.charged_amount);
    b.count += 1;
    if (b.topExamples.length < 3 && !b.topExamples.includes(tx.description)) b.topExamples.push(tx.description);
    bucketsMap.set(key, b);
  }
  const buckets = Array.from(bucketsMap.values()).map((b) => {
    const projectedAmount = forecastBucket(b, progress.ratio);
    const baseline = b.baseline || b.amount;
    const variance = b.kind === "expense" && !["fixed", "asset"].includes(b.controllability)
      ? Math.max(0, projectedAmount - baseline)
      : 0;
    return { ...b, projectedAmount, baseline, variance };
  }).sort((a, b) => b.amount - a.amount);

  const monthlyMap = new Map<string, MonthlyScopeSummary>();
  for (const tx of allRows) {
    const m = accountingMonthForTx(tx);
    const s = monthlyMap.get(m) ?? blankMonthly(m);
    const c = classify(tx);
    const abs = Math.abs(tx.charged_amount);
    if (c.name.includes("כרטיסים")) s.cardSettlements += abs;
    if (c.kind === "asset") s.investmentsAndFx += abs;
    if (c.kind === "income") {
      if (c.scope === "business") s.businessIncome += tx.charged_amount;
      else s.personalIncome += tx.charged_amount;
    }
    if (c.kind === "expense") {
      if (c.scope === "business") s.businessExpense += abs;
      else s.personalExpense += abs;
      if (c.controllability !== "asset") s.livingExpense += abs;
    }
    monthlyMap.set(m, s);
  }

  const sum = (pred: (b: BucketSummary) => boolean, field: "amount" | "projectedAmount" = "amount") => buckets.filter(pred).reduce((a, b) => a + b[field], 0);
  const businessIncome = sum((b) => b.scope === "business" && b.kind === "income");
  const businessExpense = sum((b) => b.scope === "business" && b.kind === "expense");
  const personalIncome = sum((b) => b.scope === "personal" && b.kind === "income");
  const personalExpense = sum((b) => b.scope === "personal" && b.kind === "expense");
  const investmentsAndFx = sum((b) => b.kind === "asset");
  const stockIncome = sum((b) => b.name.includes("מניות") && b.kind === "asset" && b.scope === "personal");
  const cardSettlements = sum((b) => b.name.includes("כרטיסים"));
  const transfers = sum((b) => b.kind === "transfer");
  const income = businessIncome + personalIncome;
  const expense = businessExpense + personalExpense;
  const livingExpense = sum((b) => b.kind === "expense" && b.controllability !== "asset");
  const projectedLivingExpense = sum((b) => b.kind === "expense" && b.controllability !== "asset", "projectedAmount");
  const fixedExpense = sum((b) => b.kind === "expense" && b.controllability === "fixed");
  const flexibleExpense = sum((b) => b.kind === "expense" && b.controllability === "flexible");
  const reviewExpense = sum((b) => b.kind === "expense" && b.controllability === "review");
  const regularIncome = income;
  const projectedNet = regularIncome - projectedLivingExpense;

  const smartBudget = buckets.filter((b) => b.kind === "expense").map<SmartBudgetRow>((b) => ({
    name: b.name,
    scope: b.scope,
    kind: b.kind,
    controllability: b.controllability,
    spent: b.amount,
    projected: b.projectedAmount,
    baseline: b.baseline,
    variance: b.variance,
    decision: decisionFor({ name: b.name, scope: b.scope, kind: b.kind, controllability: b.controllability, spent: b.amount, projected: b.projectedAmount, baseline: b.baseline, variance: b.variance, decision: "" }),
  })).sort((a, b) => b.variance - a.variance || b.spent - a.spent);

  const reviewCard = buckets.find((b) => b.name.includes("כרטיסים"));
  const biggestFlexible = buckets.filter((b) => b.kind === "expense" && b.controllability === "flexible" && !b.name.includes("כרטיסים")).sort((a, b) => b.variance - a.variance || b.amount - a.amount)[0];
  const opportunities: Opportunity[] = [];
  if (reviewCard) opportunities.push({ title: "לחבר פירוט לכרטיסים שנותרו מרוכזים", detail: `נשארו ${formatIls(reviewCard.amount)} בחיובי כרטיס בלי עסקאות ספק. כאל/ויזה שכבר מפורטים לא נספרים כאן כהוצאה כפולה.`, monthlyImpact: Math.round(reviewCard.amount * 0.08), annualImpact: Math.round(reviewCard.amount * 0.08 * 12), scope: reviewCard.scope });
  if (biggestFlexible) opportunities.push({ title: `לקבוע תקרה ל-${biggestFlexible.name}`, detail: `יעד ראשון ריאלי: הורדה של 10%–15% מהקטגוריה בלי לגעת במשכנתא/השקעות.`, monthlyImpact: Math.round(biggestFlexible.amount * 0.12), annualImpact: Math.round(biggestFlexible.amount * 0.12 * 12), scope: biggestFlexible.scope });
  opportunities.push({ title: "להפריד מניות מתזרים", detail: "פעילות מט״ח/ניירות ערך מוצגת כנכס/השקעה, לא כהוצאה שוטפת — זה מונע החלטות שגויות על החודש.", monthlyImpact: 0, annualImpact: 0, scope: "all" });

  const first = opportunities[0] ?? { title: "להמשיך לעקוב", detail: "אין עדיין קטגוריה בולטת לפעולה. המשך סנכרון וסיווג יפתח החלטות טובות יותר.", monthlyImpact: 0, annualImpact: 0, scope: "all" as const };
  const decision: DecisionCard = { ...first, urgency: projectedNet < 0 ? "high" : reviewCard ? "medium" : "low", why: projectedNet < 0 ? "התחזית מצביעה על תזרים שלילי אם הקצב ימשיך." : reviewCard ? "הכסף הגדול כרגע מוסתר בחיובי כרטיסים מרוכזים." : "התזרים נראה בשליטה, אז מתמקדים בשיפור קטן ומתמשך." };

  const flexibleBase = flexibleExpense + reviewExpense;
  const savingsScenarios = [5, 10, 15].map((pct) => {
    const monthly = Math.round(flexibleBase * (pct / 100));
    return { label: `${pct}% מהגמיש`, monthly, quarterly: monthly * 3, annual: monthly * 12 };
  });

  const weeklyCoach: CoachAction[] = [
    { title: "להשלים פירוט לכרטיסים המרוכזים", detail: "כאל/ויזה שכבר מחוברים מוצגים לפי ספקים. נשאר להשלים ישראכרט/מקס/דיירקט או לייבא חשבוניות.", amount: cardSettlements, checked: cardSettlements === 0 },
    { title: "לקבוע תקרה שבועית לגמיש", detail: `נשארו ${progress.remainingDays} ימים בחודש. קבע תקרה לשבוע לפי הקטגוריה הגמישה הגדולה ביותר.`, amount: biggestFlexible?.amount ?? 0, checked: false },
    { title: "להשאיר השקעות מחוץ להוצאות", detail: "בדוק את מניות/מט״ח בנפרד כדי לא לקבל החלטות צריכה על בסיס פעילות השקעה.", amount: investmentsAndFx, checked: investmentsAndFx > 0 },
  ];

  const scoreBase = projectedNet >= 0 ? 74 : 46;
  const reviewPenalty = cardSettlements > 0 ? 10 : 0;
  const score = Math.max(0, Math.min(100, Math.round(scoreBase - reviewPenalty + Math.min(12, regularIncome / 5000))));
  const health = { score, label: score >= 75 ? "בשליטה" : score >= 55 ? "דורש תשומת לב" : "לחץ תזרימי", tone: score >= 75 ? "good" as const : score >= 55 ? "warn" as const : "bad" as const, reason: projectedNet < 0 ? `תחזית נטו של ${formatIls(projectedNet)} עד סוף החודש.` : `תחזית נטו חיובית של ${formatIls(projectedNet)}, עם ${formatIls(cardSettlements)} בכרטיסים שנותרו מרוכזים.` };
  const story = `ב-${new Date(`${month}-01T00:00:00`).toLocaleDateString("he-IL", { month: "long" })} נכנסו ${formatIls(regularIncome)} כהכנסה שוטפת, יצאו ${formatIls(livingExpense)} כהוצאות מחיה/עסק, והתחזית לסוף החודש היא ${formatIls(projectedLivingExpense)} הוצאות ו-${formatIls(projectedNet)} נטו. ההפרדה הקריטית: ${formatIls(investmentsAndFx)} מניות/מט״ח מחוץ לתזרים, ו-${formatIls(cardSettlements)} בכרטיסים שעוד אין להם עסקאות ספק במערכת.`;

  const dataQuality: DataQualityItem[] = [
    { severity: "ok", text: "One Zero מסומן כעסקי; Mercantile מסומן כפרטי לפי ההנחיה שלך." },
    { severity: "ok", text: "משכורת פרטית שנכנסת בשבוע האחרון של החודש נספרת לחודש הבא כדי למנוע עיוות." },
    { severity: cardSettlements > 0 ? "action" : "ok", text: cardSettlements > 0 ? "יש עדיין כרטיסים מרוכזים ללא עסקאות ספק. כאל/ויזה שכבר מחוברים לא נספרים כהוצאה כפולה." : "אין חיובי כרטיסים מרוכזים בחודש הנבחר." },
    { severity: investmentsAndFx > 0 ? "ok" : "warning", text: investmentsAndFx > 0 ? "פעילות מניות/מט״ח מופרדת מהוצאות רגילות." : "לא זוהתה פעילות מניות/מט״ח בחודש הנבחר." },
  ];

  return {
    month,
    monthLabel: new Date(`${month}-01T00:00:00`).toLocaleDateString("he-IL", { month: "long", year: "numeric" }),
    coverage: { from: coverage.fromDate, to: coverage.toDate, transactionCount: coverage.count },
    monthProgress: progress,
    health,
    story,
    decision,
    totals: { income, expense, livingExpense, regularIncome, businessIncome, businessExpense, businessNet: businessIncome - businessExpense, personalIncome, personalExpense, personalNet: personalIncome - personalExpense, net: income - expense, projectedLivingExpense, projectedNet, fixedExpense, flexibleExpense, reviewExpense, investmentsAndFx, stockIncome, cardSettlements, transfers },
    accounts: Array.from(accountsMap.values()).sort((a, b) => a.scope.localeCompare(b.scope) || b.count - a.count),
    buckets,
    smartBudget,
    monthly: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
    opportunities,
    weeklyCoach,
    savingsScenarios,
    dataQuality,
  };
}

function formatIls(value: number): string {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(value);
}
