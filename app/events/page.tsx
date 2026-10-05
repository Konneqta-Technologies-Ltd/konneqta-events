import type { Metadata } from "next";
import { redirect } from "next/navigation";

import CreateEventButton from "@/components/dashboard/CreateEventButton";
import DraftCard from "@/components/events/DraftCard";
import EventCard from "@/components/events/EventCard";
import type { EventListItem } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Events | Konneqta Events",
};

/** "Sep 23, 2026"-style label for when a row was last touched. */
function editedLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * My Events — saved drafts (resumable) and published events, from one
 * RLS-scoped query. Drafts lead with the most recently edited; published
 * events list upcoming first. Query failures degrade to the empty state
 * (logged server-side) instead of a broken dashboard.
 */
export default async function MyEventsPage() {
  const supabase = await createClient();

  // The layout guarantees a session — scope the query to this user's own
  // rows so published events created by other organizers never appear in
  // their dashboard (everyone else's events live on Tour).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/create");

  // Attendees don't manage events — their dashboard is My Registrations.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "organizer") redirect("/events/registrations");

  const { data, error } = await supabase
    .from("events")
    .select(
      "id,status,current_step,name,theme,category,event_type,cover_image_url," +
        "start_date,end_date,venue_city,venue_country,cancelled_at,updated_at"
    )
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) console.error("[events] list query failed:", error.message);

  const rows = (data as EventListItem[] | null) ?? [];
  const drafts = rows.filter((row) => row.status === "draft");
  // Upcoming first; undated rows trail at the back until scheduled.
  const published = rows
    .filter((row) => row.status === "published")
    .sort((a, b) => (a.start_date ?? "9999").localeCompare(b.start_date ?? "9999"));
  const empty = drafts.length === 0 && published.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col">
      {/* Page header — "My Events" with the Create event button opposite right */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">My Events</h1>
        <CreateEventButton />
      </div>

      {/* Empty state — no drafts and no published events yet */}
      {empty && (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-20 text-center dark:border-zinc-700">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7 text-zinc-400"
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
          <h2 className="mt-4 text-lg font-semibold">No events yet</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-secondary-text dark:text-zinc-400">
            When you create your first event it will show up here — ready to
            share in minutes.
          </p>
          <div className="mt-6">
            <CreateEventButton label="Create events" size="lg" />
          </div>
        </div>
      )}

      {/* Drafts — unfinished wizards, most recently edited first */}
      {drafts.length > 0 && (
        <section aria-labelledby="drafts-heading" className="mt-8">
          <h2 id="drafts-heading" className="text-lg font-semibold tracking-tight">
            Drafts
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {drafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                editedLabel={editedLabel(draft.updated_at)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Events — published; Active until the event date passes, Expired after */}
      {published.length > 0 && (
        <section aria-labelledby="events-heading" className="mt-10">
          <h2 id="events-heading" className="text-lg font-semibold tracking-tight">
            Events
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {published.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

