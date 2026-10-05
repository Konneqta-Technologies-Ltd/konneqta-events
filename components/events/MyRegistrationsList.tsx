"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import Spinner from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase/client";

/** One prepared row from the My Registrations page (labels formatted server-side). */
export type MyRegistrationRow = {
  id: string;
  eventId: string;
  eventName: string;
  eventTheme: string | null;
  coverUrl: string | null;
  whenLabel: string | null;
  whereLabel: string;
  ticketName: string | null;
  registeredLabel: string;
  /** pending | approved | rejected | cancelled */
  status: string;
  eventCancelled: boolean;
};

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  cancelled: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status] ?? STATUS_STYLES.cancelled}`}
    >
      {status === "pending" ? "Pending approval" : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/**
 * The attendee's registrations (My Registrations) — one card per event
 * they registered for, with the registration status front and center.
 * Cancelling is the same two-click confirm as everywhere else; the
 * update policy accepts the row's user or the matching account email
 * (so guest registrations stay manageable after signing up).
 */
export default function MyRegistrationsList({ rows }: { rows: MyRegistrationRow[] }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    if (cancelling) return;
    setCancelling(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("event_registrations")
      .update({ status: "cancelled" })
      .eq("id", id);
    setCancelling(null);
    if (error) {
      toast.error(`Could not cancel: ${error.message}`);
      return;
    }
    toast.success("Registration cancelled");
    setConfirming(null);
    router.refresh();
  };

  if (rows.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-20 text-center dark:border-zinc-700">
        <h2 className="text-lg font-semibold">No registrations yet</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-secondary-text dark:text-zinc-400">
          Browse Tour and register for anything that looks interesting — it
          will show up here.
        </p>
        <div className="mt-6">
          <Link
            href="/tour"
            className="rounded-lg bg-main-orange px-6 py-3 text-base font-medium text-main-text transition-opacity hover:opacity-90"
          >
            Tour events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {rows.map((row) => (
        <article
          key={row.id}
          className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row dark:border-zinc-700"
        >
          {/* Cover thumb */}
          <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:h-20 sm:w-28 dark:bg-zinc-800">
            {row.coverUrl ? (
              <Image
                src={row.coverUrl}
                alt={`${row.eventName} banner`}
                fill
                sizes="112px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-zinc-400"
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
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={row.status} />
              {row.eventCancelled && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-300">
                  Event cancelled
                </span>
              )}
            </div>
            <Link
              href={`/e/${row.eventId}`}
              className="mt-1.5 block truncate text-base font-semibold hover:underline"
            >
              {row.eventName}
            </Link>
            {row.eventTheme && (
              <p className="mt-0.5 truncate text-sm text-secondary-text dark:text-zinc-400">
                {row.eventTheme}
              </p>
            )}
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-secondary-text dark:text-zinc-400">
              {row.whenLabel && <span>{row.whenLabel}</span>}
              <span aria-hidden="true">·</span>
              <span className="truncate">{row.whereLabel}</span>
              {row.ticketName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{row.ticketName}</span>
                </>
              )}
            </p>
            <p className="mt-0.5 text-xs text-secondary-text dark:text-zinc-400">
              Registered {row.registeredLabel}
            </p>
          </div>

          {(row.status === "approved" || row.status === "pending") && !row.eventCancelled && (
            <div className="flex items-start">
              {confirming === row.id ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCancel(row.id)}
                    disabled={cancelling === row.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cancelling === row.id && <Spinner size="sm" className="text-white" />}
                    {cancelling === row.id ? "Cancelling…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    disabled={cancelling === row.id}
                    className="cursor-pointer rounded-lg px-2 py-2 text-xs font-medium text-secondary-text transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    Keep
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(row.id)}
                  className="cursor-pointer rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
