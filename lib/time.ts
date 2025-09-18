export type FormatTimeOptions = Intl.DateTimeFormatOptions & { locale?: string };

export function formatTime(
  input: Date | number | string,
  opts: FormatTimeOptions = { hour: "2-digit", minute: "2-digit" }
): string {
  const d = toDate(input);
  const { locale, ...fmt } = opts;
  return new Intl.DateTimeFormat(locale || "en-US", fmt).format(d);
}

export function formatDate(
  input: Date | number | string,
  opts: FormatTimeOptions = { year: "numeric", month: "short", day: "2-digit" }
): string {
  const d = toDate(input);
  const { locale, ...fmt } = opts;
  return new Intl.DateTimeFormat(locale || "en-US", fmt).format(d);
}

export function formatDateTime(
  input: Date | number | string,
  opts: FormatTimeOptions = {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }
): string {
  const d = toDate(input);
  const { locale, ...fmt } = opts;
  return new Intl.DateTimeFormat(locale || "en-US", fmt).format(d);
}

function toDate(v: Date | number | string): Date {
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${v}`); // why: fail fast on bad data
  return d;
}
