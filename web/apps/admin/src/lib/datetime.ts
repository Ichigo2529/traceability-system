const DEFAULT_LOCALE = "en-GB";
export const APP_TIMEZONE = String(import.meta.env.VITE_APP_TIMEZONE ?? "Asia/Bangkok");

function toValidDate(value?: string | number | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value?: string | number | Date | null, locale = DEFAULT_LOCALE) {
  const date = toValidDate(value);
  if (!date) return "—";
  return date.toLocaleDateString(locale, { timeZone: APP_TIMEZONE });
}

export function formatDateTime(value?: string | number | Date | null, locale = DEFAULT_LOCALE) {
  const date = toValidDate(value);
  if (!date) return "—";
  return date.toLocaleString(locale, {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatTime(value?: string | number | Date | null, locale = DEFAULT_LOCALE) {
  const date = toValidDate(value);
  if (!date) return "—";
  return date.toLocaleTimeString(locale, {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
