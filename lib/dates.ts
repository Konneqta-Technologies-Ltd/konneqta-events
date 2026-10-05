/* ── Shared date helpers — string-comparable local yyyy-mm-dd dates ──────
 *
 * Dates are stored as plain date columns (no timezone); these helpers keep
 * every comparison and label on the same local-midnight basis so a zone
 * offset can never shift an event across the wrong day.
 */

/** Local yyyy-mm-dd (optionally offset by days) — compares against stored dates. */
export function localDateString(offsetDays = 0): string {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

/** Today, local — convenience alias for localDateString(). */
export function localToday(): string {
  return localDateString();
}

/** "Sep 23, 2026" — parsed at midnight so timezones can't shift the day. */
export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Sep 23, 2026, 4:30 PM" — for timestamptz columns like created_at. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
