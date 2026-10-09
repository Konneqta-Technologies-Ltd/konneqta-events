import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import DarkModeToggle from "@/components/DarkModeToggle";
import ShareButton from "@/components/events/public/ShareButton";
import RegistrationCard from "@/components/events/registration/RegistrationCard";
import { formatDate, localToday } from "@/lib/dates";
import {
  ACCESSIBILITY_OPTIONS,
  AGE_RESTRICTION_OPTIONS,
  MEETING_PLATFORMS,
} from "@/lib/events/constants";
import {
  categoryLabel,
  eventTypeLabel,
  publicDetailFromEventRow,
  publicDetailFromRow,
  publicTicketsFromRows,
  ticketPriceLabel,
  type PublicEventDetail,
  type PublicEventRow,
  type PublicTicketRow,
} from "@/lib/events/public";
import type { EventRow } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/server";
import { getUserDisplay } from "@/lib/user-display";

/** "6:00 PM" — 24h "HH:mm" strings rendered on a fixed date. */
function timeLabel(time: string | null): string | null {
  if (!time) return null;
  return new Date(`2000-01-01T${time}:00`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Per-event SEO — title, description and OG/Twitter cards with the cover. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("published_events_public")
    .select("name,theme,description,cover_image_url")
    .eq("id", id)
    .maybeSingle();

  if (!data) return { title: "Event not found | Konneqta Events" };

  const title = (data.name ?? "").trim() || "Untitled event";
  const description = (data.theme ?? "").trim() || (data.description ?? "").trim() || undefined;
  const images = data.cover_image_url ? [data.cover_image_url] : undefined;

  return {
    title: `${title} | Konneqta Events`,
    description,
    alternates: { canonical: `/e/${id}` },
    openGraph: { title, description, images, type: "article" },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images },
  };
}

/**
 * Public event page — the shareable face of a published event: banner,
 * schedule, location, tickets, the Step-5 details and the registration
 * card. Served from the published_events_public view (RLS exposes only
 * published events); the owner instead gets a clearly-marked draft
 * preview. Everything attendee-specific (their registration, join links)
 * is fetched for the signed-in viewer only.
 */
export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. The public row — published events only.
  const { data: row } = await supabase
    .from("published_events_public")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  // 2. Viewer — may be null; drives registration state + owner shortcuts.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let detail: PublicEventDetail | null = null;
  let draftPreview = false;
  let isOwner = false;

  if (row) {
    detail = publicDetailFromRow(row as PublicEventRow);
  } else if (user) {
    // Not published (or nonexistent) — the owner can still preview it.
    // RLS only returns the row when the viewer owns it.
    const { data: own } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
    if (own) {
      const display = getUserDisplay(user);
      detail = publicDetailFromEventRow(own as EventRow, display.displayName, display.avatarUrl);
      draftPreview = true;
      isOwner = true;
    }
  }

  if (!detail) notFound();

  // Owner of a published event — offer the edit shortcut.
  if (user && !draftPreview) {
    const { data: owned } = await supabase
      .from("events")
      .select("id")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();
    isOwner = Boolean(owned);
  }

  // 3. Tickets — the public view for live events; the owner table for the
  //    draft preview (RLS scopes both correctly).
  const { data: ticketRows } = draftPreview
    ? await supabase
        .from("event_tickets")
        .select("id,name,description,price,currency")
        .eq("event_id", id)
        .order("sort_order", { ascending: true })
    : await supabase
        .from("published_event_tickets")
        .select("id,name,description,price,currency")
        .eq("event_id", id)
        .order("sort_order", { ascending: true });
  const tickets = publicTicketsFromRows((ticketRows as PublicTicketRow[] | null) ?? []);

  // 4. Registration counts — the "X of Y spots filled" hint.
  const { data: statsRow } = await supabase
    .from("event_registration_stats")
    .select("active_count")
    .eq("event_id", id)
    .maybeSingle();
  const activeCount = statsRow?.active_count ?? 0;

  // 5. The viewer's own registration, if any — matched by user id OR
  //    account email, so a guest registration carries over after signing up.
  let existing: { id: string; status: string } | null = null;
  if (user && !draftPreview) {
    const { data: reg } = await supabase
      .from("my_event_registrations")
      .select("id,status")
      .eq("event_id", id)
      .maybeSingle();
    existing = (reg as { id: string; status: string } | null) ?? null;
  }

  // 6. Join details — via the get_event_join_details RPC, which only
  //    answers for approved attendees of live online/hybrid events
  //    (matched by user id or account email).
  let meetingLink: string | null = null;
  let meetingId: string | null = null;
  if (
    existing?.status === "approved" &&
    (detail.eventType === "online" || detail.eventType === "hybrid")
  ) {
    const { data: joinData } = await supabase.rpc("get_event_join_details", {
      p_event_id: id,
    });
    const join = joinData as
      | { ok?: boolean; meeting_link?: string | null; meeting_id?: string | null }
      | null;
    if (join?.ok) {
      meetingLink = join.meeting_link ?? null;
      meetingId = join.meeting_id ?? null;
    }
  }

  // 7. Prefill for the registration form.
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const metaStr = (key: string): string =>
    typeof meta[key] === "string" ? (meta[key] as string) : "";
  const viewer = user
    ? {
        firstName: metaStr("first_name") || metaStr("name").split(" ")[0] || "",
        lastName: metaStr("last_name") || "",
        email: user.email ?? "",
      }
    : null;

  // Status flags.
  const lastDay = detail.endDate ?? detail.startDate;
  const expired = !draftPreview && lastDay != null && lastDay < localToday();
  const cancelled = !draftPreview && detail.cancelledAt != null;

  const category = categoryLabel(detail);
  const typeText = eventTypeLabel(detail);
  const platformText = detail.platform
    ? (MEETING_PLATFORMS.find((option) => option.value === detail!.platform)?.label ??
      detail.platform)
    : null;

  const dateRange = detail.startDate
    ? detail.endDate && detail.endDate !== detail.startDate
      ? `${formatDate(detail.startDate)} – ${formatDate(detail.endDate)}`
      : formatDate(detail.startDate)
    : "Date TBC";

  const startText = timeLabel(detail.startTime);
  const endText = timeLabel(detail.endTime);
  const timeRange =
    startText && endText && endText !== startText
      ? `${startText} – ${endText}`
      : (startText ?? (detail.startTime ? startText : null));

  const place = [detail.venueCity, detail.venueCountry].filter(Boolean).join(", ");
  const ageText = detail.ageRestriction
    ? AGE_RESTRICTION_OPTIONS.find((option) => option.value === detail!.ageRestriction)
        ?.label === "Custom"
      ? detail.ageRestrictionCustom?.trim() || "Custom"
      : AGE_RESTRICTION_OPTIONS.find((option) => option.value === detail!.ageRestriction)?.label
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header — back to Tour + dark mode toggle (same pattern as /tour) */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link
          href="/tour"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          ← Tour events
        </Link>
        <DarkModeToggle className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800" />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16">
        {/* Status banners — draft preview / cancelled lead the page. */}
        {draftPreview && (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            Draft preview — only you can see this page. Publish the event from
            the wizard to make it live.
          </div>
        )}
        {cancelled && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
            This event has been cancelled by the organizer.
          </div>
        )}
        {expired && !cancelled && (
          <div className="mb-4 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-secondary-text dark:bg-zinc-800 dark:text-zinc-400">
            This event has ended — it stays listed for reference.
          </div>
        )}

        {/* Banner */}
        <div className="relative h-56 w-full overflow-hidden rounded-2xl bg-zinc-100 sm:h-72 dark:bg-zinc-800">
          {detail.coverImageUrl ? (
            <Image
              src={detail.coverImageUrl}
              alt={`${detail.name} banner`}
              fill
              priority
              sizes="(min-width: 1024px) 960px, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-zinc-400"
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
          {!draftPreview && (
            <span
              className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${
                cancelled
                  ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                  : expired
                    ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
              }`}
            >
              {cancelled ? "Cancelled" : expired ? "Ended" : "Active"}
            </span>
          )}
        </div>

        {/* Title block */}
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {category && (
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-secondary-text dark:bg-zinc-800 dark:text-zinc-400">
                  {category}
                </span>
              )}
              {typeText && (
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-secondary-text dark:bg-zinc-800 dark:text-zinc-400">
                  {typeText}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{detail.name}</h1>
            {detail.theme && (
              <p className="mt-2 max-w-2xl text-base leading-7 text-secondary-text dark:text-zinc-400">
                {detail.theme}
              </p>
            )}
            <div className="mt-4 flex items-center gap-2.5">
              {detail.organizerAvatar ? (
                <Image
                  src={detail.organizerAvatar}
                  alt={detail.organizerName ?? "Organizer"}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-main-orange text-xs font-semibold text-main-text">
                  {(detail.organizerName ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-sm text-secondary-text dark:text-zinc-400">
                Hosted by{" "}
                <span className="font-medium text-foreground">
                  {detail.organizerName ?? "the organizer"}
                </span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <Link
                href={`/events/create/1?id=${detail.id}`}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Edit
              </Link>
            )}
            {!draftPreview && <ShareButton />}
          </div>
        </div>

        {detail.hashtags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {detail.hashtags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-secondary-text dark:border-zinc-700 dark:text-zinc-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Two columns — content + sidebar (stacked on mobile). */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-10 lg:col-span-2">
            {detail.description && (
              <section aria-labelledby="about-heading">
                <h2 id="about-heading" className="text-lg font-semibold tracking-tight">
                  About this event
                </h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-secondary-text dark:text-zinc-400">
                  {detail.description}
                </p>
              </section>
            )}

            {(detail.whoShouldAttend ||
              detail.whatToExpect ||
              detail.requirements ||
              detail.dressCode ||
              ageText ||
              detail.accessibility.length > 0 ||
              detail.additionalInfo) && (
              <section aria-labelledby="details-heading">
                <h2 id="details-heading" className="text-lg font-semibold tracking-tight">
                  Good to know
                </h2>
                <dl className="mt-3 flex flex-col divide-y divide-border dark:divide-zinc-800">
                  {detail.whoShouldAttend && (
                    <div className="py-3">
                      <dt className="text-sm font-medium">Who should attend</dt>
                      <dd className="mt-1 text-sm leading-6 text-secondary-text dark:text-zinc-400">
                        {detail.whoShouldAttend}
                      </dd>
                    </div>
                  )}
                  {detail.whatToExpect && (
                    <div className="py-3">
                      <dt className="text-sm font-medium">What to expect</dt>
                      <dd className="mt-1 text-sm leading-6 text-secondary-text dark:text-zinc-400">
                        {detail.whatToExpect}
                      </dd>
                    </div>
                  )}
                  {detail.requirements && (
                    <div className="py-3">
                      <dt className="text-sm font-medium">Requirements</dt>
                      <dd className="mt-1 text-sm leading-6 text-secondary-text dark:text-zinc-400">
                        {detail.requirements}
                      </dd>
                    </div>
                  )}
                  {detail.dressCode && (
                    <div className="py-3">
                      <dt className="text-sm font-medium">Dress code</dt>
                      <dd className="mt-1 text-sm leading-6 text-secondary-text dark:text-zinc-400">
                        {detail.dressCode}
                      </dd>
                    </div>
                  )}
                  {ageText && (
                    <div className="py-3">
                      <dt className="text-sm font-medium">Age requirement</dt>
                      <dd className="mt-1 text-sm leading-6 text-secondary-text dark:text-zinc-400">
                        {ageText}
                      </dd>
                    </div>
                  )}
                  {detail.accessibility.length > 0 && (
                    <div className="py-3">
                      <dt className="text-sm font-medium">Accessibility</dt>
                      <dd className="mt-1 flex flex-wrap gap-2">
                        {detail.accessibility.map((value) => (
                          <span
                            key={value}
                            className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-secondary-text dark:bg-zinc-800 dark:text-zinc-400"
                          >
                            {ACCESSIBILITY_OPTIONS.find((option) => option.value === value)?.label ??
                              value}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                  {detail.additionalInfo && (
                    <div className="py-3">
                      <dt className="text-sm font-medium">Additional information</dt>
                      <dd className="mt-1 whitespace-pre-line text-sm leading-6 text-secondary-text dark:text-zinc-400">
                        {detail.additionalInfo}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            )}
          </div>

          {/* Sidebar — logistics first, then the registration card. */}
          <div className="flex flex-col gap-6">
            <section
              aria-labelledby="when-heading"
              className="rounded-2xl border border-border p-5 dark:border-zinc-700"
            >
              <h2 id="when-heading" className="text-lg font-semibold tracking-tight">
                When
              </h2>
              <p className="mt-2 text-sm font-medium">{dateRange}</p>
              {timeRange && (
                <p className="mt-1 text-sm text-secondary-text dark:text-zinc-400">
                  {timeRange}
                  {detail.timezone ? ` (${detail.timezone.replace(/_/g, " ")})` : ""}
                </p>
              )}
            </section>

            <section
              aria-labelledby="where-heading"
              className="rounded-2xl border border-border p-5 dark:border-zinc-700"
            >
              <h2 id="where-heading" className="text-lg font-semibold tracking-tight">
                Where
              </h2>

              {(detail.eventType === "in_person" || detail.eventType === "hybrid") &&
                (detail.venueName || detail.venueAddress || place) && (
                  <div className="mt-2 text-sm">
                    {detail.venueName && <p className="font-medium">{detail.venueName}</p>}
                    {detail.venueAddress && (
                      <p className="mt-1 text-secondary-text dark:text-zinc-400">
                        {detail.venueAddress}
                      </p>
                    )}
                    {place && <p className="mt-1 text-secondary-text dark:text-zinc-400">{place}</p>}
                    {detail.mapLocation && (
                      <a
                        href={
                          detail.mapLocation.startsWith("http")
                            ? detail.mapLocation
                            : `https://maps.google.com/?q=${encodeURIComponent(detail.mapLocation)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm font-medium text-(--main-orange) hover:underline"
                      >
                        View on map →
                      </a>
                    )}
                  </div>
                )}

              {(detail.eventType === "online" || detail.eventType === "hybrid") && (
                <div className="mt-2 text-sm">
                  {platformText ? <p className="font-medium">{platformText}</p> : <p className="font-medium">Online</p>}
                  <p className="mt-1 text-secondary-text dark:text-zinc-400">
                    Join details are shared with registered attendees.
                  </p>
                  {detail.outlets.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      {detail.outlets.map((outlet, index) =>
                        outlet.link ? (
                          <a
                            key={`${outlet.platform}-${index}`}
                            href={outlet.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-(--main-orange) hover:underline"
                          >
                            {MEETING_PLATFORMS.find((option) => option.value === outlet.platform)
                              ?.label ?? (outlet.platform || "Watch live")}{" "}
                            →
                          </a>
                        ) : (
                          <span
                            key={`${outlet.platform}-${index}`}
                            className="text-secondary-text dark:text-zinc-400"
                          >
                            {MEETING_PLATFORMS.find((option) => option.value === outlet.platform)
                              ?.label ?? outlet.platform}
                          </span>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              {!detail.venueName && !place && detail.eventType === "in_person" && (
                <p className="mt-2 text-sm text-secondary-text dark:text-zinc-400">Location TBC</p>
              )}
            </section>

            {tickets.length > 0 && (
              <section
                aria-labelledby="tickets-heading"
                className="rounded-2xl border border-border p-5 dark:border-zinc-700"
              >
                <h2 id="tickets-heading" className="text-lg font-semibold tracking-tight">
                  Tickets
                </h2>
                <ul className="mt-2 flex flex-col divide-y divide-border dark:divide-zinc-800">
                  {tickets.map((ticket) => (
                    <li key={ticket.id} className="flex items-start justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{ticket.name}</span>
                        {ticket.description && (
                          <span className="mt-0.5 block text-xs text-secondary-text dark:text-zinc-400">
                            {ticket.description}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-sm text-secondary-text dark:text-zinc-400">
                        {ticketPriceLabel(ticket)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <RegistrationCard
              eventId={detail.id}
              draftPreview={draftPreview}
              cancelled={cancelled}
              expired={expired}
              registrationStatus={detail.registrationStatus}
              registrationOpens={detail.registrationOpens}
              registrationCloses={detail.registrationCloses}
              capacityType={detail.capacityType}
              maxAttendees={detail.maxAttendees}
              activeCount={activeCount}
              approvalType={detail.approvalType}
              questions={detail.questions}
              tickets={tickets}
              existing={existing}
              viewer={viewer}
              meetingLink={meetingLink}
              meetingId={meetingId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
