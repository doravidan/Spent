export function normalizeOneZeroPhoneNumber(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  let compact = trimmed.replace(/[\s().-]/g, "");

  if (compact.startsWith("00")) {
    compact = `+${compact.slice(2)}`;
  }

  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/\D/g, "")}`;
  }

  const digits = compact.replace(/\D/g, "");
  if (digits.startsWith("972")) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length >= 9) {
    return `+972${digits.slice(1)}`;
  }

  return digits ? `+${digits}` : "";
}
