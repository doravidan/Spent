export function formatCurrency(amount: number, currency = "ILS"): string {
  if (currency === "ILS") {
    return `₪${Math.abs(amount).toLocaleString("en-IL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return new Intl.NumberFormat("en-IL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

export function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatMonth(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("he-IL", { month: "short", year: "numeric" });
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getMonthRange(date: Date = new Date()): {
  from: string;
  to: string;
} {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    from: toLocalDateString(from),
    to: toLocalDateString(to),
  };
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// The DB returns datetime('now') in UTC without a Z suffix.
export function formatLastSync(iso: string | null): string {
  if (!iso) return "לא סונכרן עדיין";
  const synced = new Date(iso + "Z").getTime();
  const ageMs = Date.now() - synced;
  if (!Number.isFinite(ageMs) || ageMs < 0) return "כרגע";

  const sec = Math.floor(ageMs / 1000);
  if (sec < 60) return "כרגע";
  const min = Math.floor(sec / 60);
  if (min < 60) return `לפני ${min} דק׳`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `לפני ${hr} שעות`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `לפני ${day} ימים`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `לפני ${wk} שבועות`;
  const mo = Math.floor(day / 30);
  return `לפני ${mo} חודשים`;
}

export function formatJerusalemTimeOfDay(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
