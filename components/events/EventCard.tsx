"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import Spinner from "@/components/ui/Spinner";
import { localToday } from "@/lib/dates";
import { EVENT_TYPES } from "@/lib/events/constants";
import type { EventListItem } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/client";

/** Where the event happens — "Online" for streams, "City, Country" otherwise. */
function locationLabel(event: EventListItem): string {
  if (event.event_type === "online") return "Online";
  const place = [event.venue_city, event.venue_country].filter(Boolean).join(", ");
  return place || "Location TBC";
}

/** Which lifecycle action the bottom row is confirming, if any. */
type Confirming = "unpublish" | "cancel" | null;

/**
 * One published event on My Events — banner, name with tagline underneath,
 * location and event type, plus the organizer's lifecycle actions:
 *
 * - View: the public /e/<id> page.
 * - Registrations: who signed up (approve/reject/CSV).
 * - Edit: re-enter the wizard (a published event's status is never knocked
 *   back to draft by saves).
 * - Unpublish: back to draft — drops it off Tour (two-click confirm).
 * - Cancel event / Restore: flags the event as called off while it stays
 *   published (banner everywhere, registrations blocked) — reversible.
 *
 * The status badge reads Cancelled first, then Expired once the event's
 * end date — or start date when there's no end — has passed.
 */
export default function EventCard({ event }: { event: EventListItem }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [working, setWorking] = useState<Confirming>(null);

  const typeLabel =
    EVENT_TYPES.find((option) => option.value === event.event_type)?.label ?? null;

  const cancelled = event.cancelled_at != null;
  // Undated events stay Active until the schedule is filled in.
  const lastDay = event.end_date ?? event.start_date;
  const expired = lastDay != null && lastDay < localToday();

  const runAction = async (action: Exclude<Confirming, null>) => {
    if (working) return;
    setWorking(action);
    const supabase = createClient();
    const { error } =
      action === "unpublish"
        ? await supabase.from("events").update({ status: "draft" }).eq("id", event.id)
        : cancelled
          ? // Restore — clear the cancellation flag.
            await supabase.from("events").update({ cancelled_at: null }).eq("id", event.id)
          : await supabase.from("events").update({ cancelled_at: new Date().toISOString() }).eq("id", event.id);
    setWorking(null);
    if (error) {
      toast.error(`Could not ${action === "unpublish" ? "unpublish" : "cancel event"}: ${error.message}`);
      return;
    }
    toast.success(
      action === "unpublish"
        ? "Event unpublished — it's back to drafts and off Tour"
        : cancelled
          ? "Event restored"
          : "Event cancelled — attendees will see a notice on the event page"
    );
    setConfirming(null);
    router.refresh();
  };

  return (
    <article className="flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-border bg-background dark:border-zinc-700">
      <div className="min-w-0">
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
              cancelled
                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                : expired
                  ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
            }`}
          >
            {cancelled ? "Cancelled" : expired ? "Expired" : "Active"}
          </span>
        </div>

        <div className="p-4">
          <Link
            href={`/e/${event.id}`}
            className="block truncate text-base font-semibold hover:underline"
          >
            {event.name?.trim() || "Untitled event"}
          </Link>
          {event.theme && (
            <p className="mt-1 line-clamp-2 text-sm text-secondary-text dark:text-zinc-400">
              {event.theme}
            </p>
          )}
          <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-secondary-text dark:text-zinc-400">
            <span className="truncate">{locationLabel(event)}</span>
            {typeLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span>{typeLabel}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
        <Link
          href={`/e/${event.id}`}
          className="rounded-lg bg-main-orange px-3.5 py-2 text-sm font-semibold text-main-text transition-opacity hover:opacity-90"
        >
          View
        </Link>
        <Link
          href={`/events/${event.id}/registrations`}
          className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Registrations
        </Link>
        <Link
          href={`/events/create/1?id=${event.id}`}
          className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Edit
        </Link>

        {confirming ? (
          <>
            <button
              type="button"
              onClick={() => runAction(confirming)}
              disabled={working !== null}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                confirming === "cancel" ? "bg-red-600 hover:bg-red-700" : "bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white"
              }`}
            >
              {working === confirming && <Spinner size="sm" className="text-white" />}
              {confirming === "cancel"
                ? working
                  ? "Cancelling…"
                  : "Confirm cancel"
                : working
                  ? "Unpublishing…"
                  : "Confirm unpublish"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              disabled={working !== null}
              className="cursor-pointer rounded-lg px-2 py-2 text-sm font-medium text-secondary-text transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Back
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setConfirming("cancel")}
              className="cursor-pointer rounded-lg border border-amber-200 px-3.5 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-400 dark:hover:bg-amber-950/40"
            >
              {cancelled ? "Restore" : "Cancel event"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming("unpublish")}
              className="cursor-pointer rounded-lg border border-red-200 px-3.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Unpublish
            </button>
          </>
        )}
      </div>
    </article>
  );
}

