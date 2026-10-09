import Image from "next/image";
import Link from "next/link";

import { EVENT_TYPES } from "@/lib/events/constants";

/** Column subset the Tour page selects from public.events. */
export type TourEventRow = {
  id: string;
  name: string | null;
  theme: string | null;
  cover_image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  event_type: string | null;
  venue_city: string | null;
  venue_country: string | null;
};

/** Local yyyy-mm-dd — string-comparable against the stored date columns. */
function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

/** "Sep 23, 2026" — parsed at midnight so timezones can't shift the day. */
function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Where the event happens — "Online" for streams, "City, Country" otherwise. */
function locationLabel(event: TourEventRow): string {
  if (event.event_type === "online") return "Online";
  const place = [event.venue_city, event.venue_country].filter(Boolean).join(", ");
  return place || "Location TBC";
}

/**
 * One published event on the public Tour page — banner, name with
 * tagline underneath, date, location, type and a price hint. The badge
 * reads Active (green) until the event's end date — or start date when
 * there's no end — has passed, then flips to Expired (red) on its own.
 */
export default function PublicEventCard({
  event,
  priceHint,
}: {
  event: TourEventRow;
  /** "Free" / "From NGN 2,500" — null when the event has no tickets. */
  priceHint: string | null;
}) {
  const typeLabel =
    EVENT_TYPES.find((option) => option.value === event.event_type)?.label ?? null;

  // Undated events stay Active until the schedule is filled in.
  const lastDay = event.end_date ?? event.start_date;
  const expired = lastDay != null && lastDay < localToday();

  const start = event.start_date ? formatDate(event.start_date) : "Date TBC";
  const dateLabel =
    event.end_date && event.end_date !== event.start_date
      ? `${start} – ${formatDate(event.end_date)}`
      : start;

  return (
    <Link
      href={`/e/${event.id}`}
      className="block overflow-hidden rounded-2xl border border-border bg-background transition-colors hover:border-(--main-orange) dark:border-zinc-700 dark:hover:border-(--main-orange)"
    >
      <article className="overflow-hidden rounded-2xl">
      <div className="relative h-36 w-full bg-zinc-100 dark:bg-zinc-800">
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
            alt={`${event.name ?? "Event"} banner`}
            fill
            sizes="(min-width: 640px) 480px, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-zinc-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
        )}
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${
            expired
              ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
          }`}
        >
          {expired ? "Expired" : "Active"}
        </span>
      </div>

      <div className="p-4">
        <h3 className="truncate text-base font-semibold">
          {event.name?.trim() || "Untitled event"}
        </h3>
        {event.theme && (
          <p className="mt-1 line-clamp-2 text-sm text-secondary-text dark:text-zinc-400">
            {event.theme}
          </p>
        )}
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-secondary-text dark:text-zinc-400">
          <span className="truncate">{dateLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{locationLabel(event)}</span>
          {typeLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span>{typeLabel}</span>
            </>
          )}
          {priceHint && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-foreground dark:text-zinc-200">{priceHint}</span>
            </>
          )}
        </p>
      </div>
      </article>
    </Link>
  );
}
