import type { Metadata } from "next";

import MyRegistrationsList, {
  type MyRegistrationRow,
} from "@/components/events/MyRegistrationsList";
import { formatDate, formatDateTime, localDateString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Registrations | Konneqta Events",
};

/** Column subset selected from the my_event_registrations view. */
type RegistrationViewRow = {
  id: string;
  event_id: string;
  status: string;
  ticket_id: string | null;
  created_at: string;
  event_name: string | null;
  event_theme: string | null;
  cover_image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  timezone: string | null;
  event_type: string | null;
  venue_city: string | null;
  venue_country: string | null;
  cancelled_at: string | null;
};

/** "6:00 PM" from a Postgres HH:mm(:ss) time string. */
function timeLabel(time: string | null): string | null {
  if (!time) return null;
  return new Date(`2000-01-01T${time.slice(0, 5)}:00`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * My Registrations — the attendee dashboard. Every event the signed-in
 * user registered for (matched by account — user id or email, so guest
 * registrations carry over after signing up), newest first, with the
 * registration status and a self-service cancel.
 */
export default async function MyRegistrationsPage() {
  const supabase = await createClient();

  // The view filters to the caller's rows (user id or account email).
  const { data: registrationRows, error } = await supabase
    .from("my_event_registrations")
    .select(
      "id,event_id,status,ticket_id,created_at,event_name,event_theme,cover_image_url," +
        "start_date,end_date,start_time,end_time,timezone,event_type,venue_city,venue_country,cancelled_at"
    )
    .order("created_at", { ascending: false });
  if (error) console.error("[registrations] my list query failed:", error.message);

  const raw = (registrationRows as RegistrationViewRow[] | null) ?? [];

  // Ticket names for the rows on this page (public tickets view).
  const eventIds = Array.from(new Set(raw.map((row) => row.event_id)));
  const { data: ticketRows } = eventIds.length
    ? await supabase
        .from("published_event_tickets")
        .select("id,name")
        .in("event_id", eventIds)
    : { data: null };
  const ticketNames = new Map(
    ((ticketRows ?? []) as { id: string; name: string | null }[]).map((ticket) => [
      ticket.id,
      ticket.name?.trim() || "Ticket",
    ])
  );

  const today = localDateString();
  const rows: MyRegistrationRow[] = raw.map((row) => {
    // When — date range + time window, same conventions as the public page.
    const dateRange = row.start_date
      ? row.end_date && row.end_date !== row.start_date
        ? `${formatDate(row.start_date)} – ${formatDate(row.end_date)}`
        : formatDate(row.start_date)
      : "Date TBC";
    const start = timeLabel(row.start_time);
    const end = timeLabel(row.end_time);
    const timeRange =
      start && end && end !== start ? `${start} – ${end}` : start ?? null;
    const whenLabel = timeRange
      ? `${dateRange} · ${timeRange}${row.timezone ? ` (${row.timezone.replace(/_/g, " ")})` : ""}`
      : dateRange;

    // Where — "Online" for streams, "City, Country" otherwise.
    const place = [row.venue_city, row.venue_country].filter(Boolean).join(", ");
    const whereLabel =
      row.event_type === "online" ? "Online" : place || "Location TBC";

    return {
      id: row.id,
      eventId: row.event_id,
      eventName: row.event_name?.trim() || "Untitled event",
      eventTheme: row.event_theme,
      coverUrl: row.cover_image_url,
      whenLabel,
      whereLabel,
      ticketName: row.ticket_id ? (ticketNames.get(row.ticket_id) ?? null) : null,
      registeredLabel: formatDateTime(row.created_at),
      status: row.status,
      eventCancelled: row.cancelled_at != null,
    };
  });

  const upcomingCount = raw.filter(
    (row) => row.status !== "cancelled" && (row.end_date ?? row.start_date ?? today) >= today
  ).length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">My Registrations</h1>
        <p className="text-sm text-secondary-text dark:text-zinc-400">
          {upcomingCount > 0
            ? `${upcomingCount.toLocaleString("en-US")} upcoming`
            : "You're all caught up"}
        </p>
      </div>
      <p className="mt-2 max-w-xl text-sm leading-6 text-secondary-text dark:text-zinc-400">
        Events you&apos;ve registered for — including ones you signed up for
        before creating an account (matched by email).
      </p>

      <MyRegistrationsList rows={rows} />
    </div>
  );
}
