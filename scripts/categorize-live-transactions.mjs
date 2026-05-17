#!/usr/bin/env node
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const DB_PATH = path.join(ROOT, "data", "spent.db");
const db = new Database(DB_PATH);

const WORKSPACE_ID = 1;

const categories = [
  {
    name: "Salary",
    kind: "income",
    color: "#73C4A8",
    icon: "briefcase-business",
    description: "Private salary income. Late-month deposits from recurring salaries may belong to the next accounting month in the CEO dashboard.",
  },
  {
    name: "Child Benefits",
    kind: "income",
    color: "#92D5B7",
    icon: "baby",
    description: "Family allowances or recurring family benefit payments.",
  },
  {
    name: "Business Revenue",
    kind: "income",
    color: "#65C1D1",
    icon: "landmark",
    description: "Income or reimbursements into the business account.",
  },
  {
    name: "Investment Proceeds",
    kind: "income",
    color: "#9186D1",
    icon: "trending-up",
    description: "Asset liquidation, broker transfers, stock/RSU proceeds; not regular household income.",
  },
  {
    name: "Transfers In Review",
    kind: "income",
    color: "#A2ABBB",
    icon: "arrow-down-up",
    description: "Incoming internal/family transfers that are not necessarily real income.",
  },
  {
    name: "Mortgage",
    kind: "expense",
    color: "#D6C480",
    icon: "home",
    description: "Mortgage and fixed housing debt payments.",
  },
  {
    name: "Personal Card Settlements",
    kind: "expense",
    color: "#E7A875",
    icon: "credit-card",
    description: "Aggregated personal card settlement; merchant-level detail is missing until card/invoice data is connected.",
  },
  {
    name: "Business Card Settlements",
    kind: "expense",
    color: "#A4C386",
    icon: "credit-card",
    description: "Aggregated business card settlement; merchant-level detail is missing until card/invoice data is connected.",
  },
  {
    name: "Donations",
    kind: "expense",
    color: "#BF9ED9",
    icon: "heart-handshake",
    description: "Charity, Chabad, community and donation payments.",
  },
  {
    name: "Transfers & Checks Review",
    kind: "expense",
    color: "#A2ABBB",
    icon: "arrow-down-up",
    description: "Outgoing transfers/checks that need business/private purpose review.",
  },
  {
    name: "Investments & FX",
    kind: "expense",
    color: "#9186D1",
    icon: "candlestick-chart",
    description: "Stock purchases, FX coverage, securities activity; treated as asset movement in the CEO dashboard, not normal spending.",
  },
  {
    name: "Securities Fees",
    kind: "expense",
    color: "#7D90CA",
    icon: "receipt-text",
    description: "Brokerage, exchange and securities transaction fees.",
  },
  {
    name: "Bank Fees & Interest",
    kind: "expense",
    color: "#D692BF",
    icon: "landmark",
    description: "Bank fees, overdraft interest, credit allocation and FX fees.",
  },
  {
    name: "Bank Subscription",
    kind: "expense",
    color: "#BFB89B",
    icon: "badge-dollar-sign",
    description: "Recurring bank/account subscription fee.",
  },
  {
    name: "Business Reimbursements",
    kind: "income",
    color: "#65C1D1",
    icon: "wallet-cards",
    description: "Small business credits/reimbursements such as subscription credits or vendor refunds.",
  },
];

function ensureCategory(c) {
  const existing = db.prepare(
    "SELECT id FROM categories WHERE workspace_id = ? AND name = ? COLLATE NOCASE"
  ).get(WORKSPACE_ID, c.name);
  if (existing) {
    db.prepare(
      "UPDATE categories SET kind = ?, color = ?, icon = ?, description = ?, budget_mode = 'tracking' WHERE workspace_id = ? AND id = ?"
    ).run(c.kind, c.color, c.icon, c.description, WORKSPACE_ID, existing.id);
    return existing.id;
  }
  const result = db.prepare(
    "INSERT INTO categories (workspace_id, parent_id, name, color, icon, kind, budget_mode, description) VALUES (?, NULL, ?, ?, ?, ?, 'tracking', ?)"
  ).run(WORKSPACE_ID, c.name, c.color, c.icon, c.kind, c.description);
  return Number(result.lastInsertRowid);
}

function text(tx) {
  return `${tx.description ?? ""} ${tx.memo ?? ""}`.toLowerCase();
}
function has(t, needles) {
  return needles.some((n) => t.includes(n));
}

function classify(tx, ids) {
  const t = text(tx);
  const amount = Number(tx.charged_amount);
  const provider = tx.provider;
  const isBusiness = provider === "oneZero";

  if (amount > 0) {
    if (has(t, ["משכורת", "salary", "hsbc", "בי\"ח", "לניאד", "בית חולים"])) {
      return { categoryId: ids.Salary, kind: "income", confidence: 7, review: 0 };
    }
    if (has(t, ["ביטוח לאומי", "ילדים"])) {
      return { categoryId: ids["Child Benefits"], kind: "income", confidence: 7, review: 0 };
    }
    if (has(t, ["equatex", "זיכוי זה\"ב", "מניות", "ני\"ע", "ניירות"])) {
      return { categoryId: ids["Investment Proceeds"], kind: "income", confidence: 6, review: 0 };
    }
    if (isBusiness || has(t, ["אולסי", "מערכות", "apple", "העברה ממזרחי", "העברה מלאומי", "ליובביטש"])) {
      return { categoryId: ids["Business Revenue"], kind: "income", confidence: 6, review: 0 };
    }
    if (has(t, ["העברה מדור", "העברה מאבידן", "ביט משיכה", "הפקדת שיק"])) {
      return { categoryId: ids["Transfers In Review"], kind: "transfer", confidence: 4, review: 1 };
    }
    return { categoryId: ids["Transfers In Review"], kind: "income", confidence: 3, review: 1 };
  }

  if (has(t, ["רכישת מטח", "טלפון ני/micron", "micron tech", "מיקרון", "אינטל", "סופר מיקרו", "ניירות", "ני\"ע"])) {
    if (has(t, ["עמלה", "עמלת"])) {
      return { categoryId: ids["Securities Fees"], kind: "expense", confidence: 7, review: 0 };
    }
    return { categoryId: ids["Investments & FX"], kind: "expense", confidence: 7, review: 0 };
  }
  if (has(t, ["משכנתא"])) {
    return { categoryId: ids.Mortgage, kind: "expense", confidence: 7, review: 0 };
  }
  if (has(t, ["כ.א.ל", "כאל", "ישראכרט", "מקס", "ויזה", "כרטיס", "דיירקט", "מכאל", "ממקס"])) {
    return {
      categoryId: isBusiness ? ids["Business Card Settlements"] : ids["Personal Card Settlements"],
      kind: "expense",
      confidence: 5,
      review: 1,
    };
  }
  if (has(t, ["בית חב", "חב\"ד", "תרומה", "נווה שלום"])) {
    return { categoryId: ids.Donations, kind: "expense", confidence: 7, review: 0 };
  }
  if (has(t, ["שיק", "הע. ל", "הו\"ק", "העברה ל", "אור טכנולוג", "יניב ינאי", "שלי זקן"])) {
    return { categoryId: ids["Transfers & Checks Review"], kind: "expense", confidence: 4, review: 1 };
  }
  if (has(t, ["דמי מנוי", "one"])) {
    return { categoryId: ids["Bank Subscription"], kind: "expense", confidence: 7, review: 0 };
  }
  if (has(t, ["עמלה", "ריבית", "אשראי", "מס", "בנק", "חליפין", "מטח", "מט\""])) {
    return { categoryId: ids["Bank Fees & Interest"], kind: "expense", confidence: 6, review: 0 };
  }
  return { categoryId: ids["Transfers & Checks Review"], kind: "expense", confidence: 2, review: 1 };
}

const run = db.transaction(() => {
  const ids = Object.fromEntries(categories.map((c) => [c.name, ensureCategory(c)]));
  const rows = db.prepare(
    "SELECT id, provider, charged_amount, description, memo FROM transactions WHERE workspace_id = ?"
  ).all(WORKSPACE_ID);
  const update = db.prepare(
    "UPDATE transactions SET category_id = ?, category_source = 'ai', ai_confidence = ?, needs_review = ?, kind = ?, updated_at = datetime('now') WHERE workspace_id = ? AND id = ?"
  );
  let categorized = 0;
  let review = 0;
  for (const tx of rows) {
    const result = classify(tx, ids);
    update.run(result.categoryId, result.confidence, result.review, result.kind, WORKSPACE_ID, tx.id);
    categorized += 1;
    review += result.review;
  }
  return { categorized, review, categoryCount: categories.length };
});

const result = run();
console.log(JSON.stringify(result, null, 2));
