import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import RegistrationsTable, {
  type RegistrationRow,
} from "@/components/events/manage/RegistrationsTable";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Registrations | Konneqta Events",
};

/** Column subset the registrations page selects from public.events. */
type EventSummary = {
  id: string;
  owner_id: string;
  name: string | null;
  capacity_type: string | null;
  max_attendees: number | null;
};

/**
 * Organizer view — everyone who registered for one of this user's events,
 * with approve/reject for manual-approval events and a CSV export. Sits
 * under /events so the dashboard layout guarantees a session; the RLS
 * scoped queries only return rows when the viewer owns the event, and a
 * second ownership check keeps the page 404 for anyone else.
 */
export default async function RegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // RLS scopes this to the owner's rows; drafts are fine too.
  const { data: event } = await supabase
    .from("events")
    .select("id,owner_id,name,capacity_type,max_attendees")
    .eq("id", id)
    .maybeSingle();
  const summary = event as EventSummary | null;
  if (!summary || summary.owner_id !== user.id) notFound();

  const { data: registrationData, error } = await supabase
    .from("event_registrations")
    .select("id,first_name,last_name,email,status,ticket_id,answers,created_at")
    .eq("event_id", id)
    .order("created_at", { ascending: false });
  if (error) console.error("[registrations] list query failed:", error.message);
  const registrations = (registrationData as RegistrationRow[] | null) ?? [];

  const { data: ticketData } = await supabase
    .from("event_tickets")
    .select("id,name")
    .eq("event_id", id);
  const ticketNames: Record<string, string> = {};
  for (const ticket of (ticketData ?? []) as { id: string; name: string | null }[]) {
    ticketNames[ticket.id] = ticket.name?.trim() || "Ticket";
  }

  const counts = { approved: 0, pending: 0, rejected: 0, cancelled: 0 } as Record<string, number>;
  for (const row of registrations) counts[row.status] = (counts[row.status] ?? 0) + 1;
  const activeCount = counts.approved + counts.pending;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col">
      {/* Header — back to My Events, event name, public page link */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/events"
            className="text-sm font-medium text-secondary-text transition-colors hover:text-foreground dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← My Events
          </Link>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">
            {summary.name?.trim() || "Untitled event"}
          </h1>
        </div>
        <Link
          href={`/e/${summary.id}`}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          View public page
        </Link>
      </div>

      {/* Summary — counts vs capacity at a glance */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border p-4 dark:border-zinc-700">
          <p className="text-2xl font-semibold">{activeCount.toLocaleString("en-US")}</p>
          <p className="mt-1 text-xs text-secondary-text dark:text-zinc-400">
            {summary.capacity_type === "limited" && summary.max_attendees != null
              ? `of ${summary.max_attendees.toLocaleString("en-US")} spots`
              : "Active registrations"}
          </p>
        </div>
        <div className="rounded-2xl border border-border p-4 dark:border-zinc-700">
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {counts.approved}
          </p>
          <p className="mt-1 text-xs text-secondary-text dark:text-zinc-400">Approved</p>
        </div>
        <div className="rounded-2xl border border-border p-4 dark:border-zinc-700">
          <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
            {counts.pending}
          </p>
          <p className="mt-1 text-xs text-secondary-text dark:text-zinc-400">Pending</p>
        </div>
        <div className="rounded-2xl border border-border p-4 dark:border-zinc-700">
          <p className="text-2xl font-semibold text-zinc-500 dark:text-zinc-400">
            {counts.rejected + counts.cancelled}
          </p>
          <p className="mt-1 text-xs text-secondary-text dark:text-zinc-400">
            Rejected / cancelled
          </p>
        </div>
      </div>

      <RegistrationsTable registrations={registrations} ticketNames={ticketNames} />
    </div>
  );
}
