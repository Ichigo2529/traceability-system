/**
 * Shift-day computation per Design Bible.
 * Shift boundary: 08:00 Asia/Bangkok (UTC+7).
 * Before 08:00 -> previous calendar day; at/after 08:00 -> today.
 *
 * Returns YYYY-MM-DD string.
 */
export function computeShiftDay(timestamp?: Date): string {
  const now = timestamp ?? new Date();

  // Convert to Asia/Bangkok (UTC+7) by adding 7 hours offset.
  const bangkokMs = now.getTime() + 7 * 60 * 60 * 1000;
  const bangkokDate = new Date(bangkokMs);

  // Extract Bangkok-local hours.
  const bangkokHours = bangkokDate.getUTCHours();

  // If before 08:00 Bangkok -> shift belongs to previous day.
  if (bangkokHours < 8) {
    bangkokDate.setUTCDate(bangkokDate.getUTCDate() - 1);
  }

  // Format YYYY-MM-DD.
  const y = bangkokDate.getUTCFullYear();
  const m = String(bangkokDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(bangkokDate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
