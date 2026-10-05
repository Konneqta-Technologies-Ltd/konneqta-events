import type { Metadata } from "next";
import Link from "next/link";

import DarkModeToggle from "@/components/DarkModeToggle";
import PublicEventCard, { type TourEventRow } from "@/components/events/PublicEventCard";
import TourFilters from "@/components/tour/TourFilters";
import { localDateString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Tour events | Konneqta Events",
};

/** Events per page. */
const PAGE_SIZE = 12;

/** Sanitized ?q= — commas and parens would break the PostgREST or-filter. */
function sanitizeQuery(raw: string): string {
  return raw.replace(/[,()]/g, " ").trim();
}

/**
 * Public listing of published events (RLS scopes selects to
 * status = 'published' — drafts are never visible here; cancelled events
 * are excluded from discovery but stay reachable via their direct /e/<id>
 * link). Search, category/type/city filters, a when-window and pagination
 * are all URL-driven via searchParams so filtered views are shareable.
 */
export default async function TourPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    type?: string;
    city?: string;
    when?: string;
    page?: string;
  }>;
}) {
  const { q = "", category = "", type = "", city = "", when = "upcoming", page = "1" } =
    await searchParams;
  const search = sanitizeQuery(q);
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);

  const supabase = await createClient();

  // Distinct cities across live events — the city filter's options. The
  // view IS the public copy of published events.
  const { data: cityRows } = await supabase
    .from("published_events_public")
    .select("venue_city")
    .is("cancelled_at", null)
    .not("venue_city", "is", null);
  const cities = Array.from(
    new Set(
      ((cityRows ?? []) as { venue_city: string | null }[]).map((row) => row.venue_city as string)
    )
  ).sort((a, b) => a.localeCompare(b));

  // Base query — the view only contains published events, so there's no
  // status filter here; cancelled ones are excluded from discovery.
  const today = localDateString();
  let query = supabase
    .from("published_events_public")
    .select(
      "id,name,theme,cover_image_url,start_date,end_date,event_type,venue_city,venue_country",
      { count: "exact" }
    )
    .is("cancelled_at", null);

  if (search) {
    query = query.or(`name.ilike.%${search}%,theme.ilike.%${search}%`);
  }
  if (category) query = query.eq("category", category);
  if (type) query = query.eq("event_type", type);
  if (city) query = query.eq("venue_city", city);

  // When-window: upcoming keeps undated + not-yet-ended events; past keeps
  // events whose last day (end ?? start) has passed, most recent first.
  if (when === "upcoming") {
    query = query
      .or(
        `end_date.gte.${today},and(end_date.is.null,start_date.gte.${today}),and(end_date.is.null,start_date.is.null)`
      )
      .order("start_date", { ascending: true, nullsFirst: false });
  } else if (when === "past") {
    query = query
      .or(`end_date.lt.${today},and(end_date.is.null,start_date.lt.${today})`)
      .order("start_date", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("start_date", { ascending: false, nullsFirst: false });
  }

  const { data, error, count } = await query.range(
    (pageNumber - 1) * PAGE_SIZE,
    pageNumber * PAGE_SIZE - 1
  );
  if (error) console.error("[tour] list query failed:", error.message);

  const rows = (data as TourEventRow[] | null) ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Price hints — the cheapest ticket per event ("Free" when it's 0),
  // from the public tickets view.
  const ids = rows.map((row) => row.id);
  const { data: ticketData } = ids.length
    ? await supabase
        .from("published_event_tickets")
        .select("event_id,price,currency")
        .in("event_id", ids)
    : { data: null };
  const cheapestByEvent = new Map<string, { price: string | null; currency: string | null }>();
  for (const ticket of (ticketData ?? []) as {
    event_id: string;
    price: string | null;
    currency: string | null;
  }[]) {
    const current = cheapestByEvent.get(ticket.event_id);
    const price = ticket.price != null ? Number(ticket.price) : 0;
    const currentPrice = current ? Number(current.price ?? 0) : Infinity;
    if (!current || price < currentPrice) cheapestByEvent.set(ticket.event_id, ticket);
  }
  const priceHint = (eventId: string): string | null => {
    const cheapest = cheapestByEvent.get(eventId);
    if (!cheapest) return null;
    const price = cheapest.price != null ? Number(cheapest.price) : 0;
    return price === 0
      ? "Free"
      : `From ${cheapest.currency || "NGN"} ${price.toLocaleString("en-US")}`;
  };

  /** Preserve current filters while turning a different page. */
  const pageHref = (target: number): string => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (type) params.set("type", type);
    if (city) params.set("city", city);
    if (when !== "upcoming") params.set("when", when);
    if (target > 1) params.set("page", String(target));
    return `/tour${params.size > 0 ? `?${params.toString()}` : ""}`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header — back link + dark mode toggle (same pattern as /create) */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Back to home
        </Link>
        <DarkModeToggle className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800" />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16">
        <h1 className="text-2xl font-semibold tracking-tight">Tour events</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-secondary-text dark:text-zinc-400">
          Discover events happening around you — search, filter by what suits
          you, and register in a few taps.
        </p>

        <TourFilters cities={cities} />

        {rows.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-20 text-center dark:border-zinc-700">
            <h2 className="text-lg font-semibold">No events found</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-secondary-text dark:text-zinc-400">
              Nothing matches these filters yet — try widening your search, or
              host the first one yourself.
            </p>
            <div className="mt-6">
              <Link
                href="/create"
                className="rounded-lg bg-main-orange px-6 py-3 text-base font-medium text-main-text transition-opacity hover:opacity-90"
              >
                Create an event
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm text-secondary-text dark:text-zinc-400">
              {total.toLocaleString("en-US")} event{total === 1 ? "" : "s"}
              {totalPages > 1 ? ` · page ${pageNumber} of ${totalPages}` : ""}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {rows.map((event) => (
                <PublicEventCard key={event.id} event={event} priceHint={priceHint(event.id)} />
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="mt-10 flex items-center justify-between" aria-label="Pagination">
                {pageNumber > 1 ? (
                  <Link
                    href={pageHref(pageNumber - 1)}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span />
                )}
                {pageNumber < totalPages ? (
                  <Link
                    href={pageHref(pageNumber + 1)}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Next →
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        )}
      </main>
    </div>
  );
}

