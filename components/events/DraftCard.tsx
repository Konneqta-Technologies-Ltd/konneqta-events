"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import Spinner from "@/components/ui/Spinner";
import { EVENT_CATEGORIES, EVENT_TYPES, TOTAL_STEPS } from "@/lib/events/constants";
import type { EventListItem } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/client";

/**
 * One saved draft on My Events. "Continue" re-enters the wizard at the
 * step the owner reached (deep link /events/create/<step>?id=… reloads
 * the row); "Delete" is a two-click confirm that removes the draft for
 * good — the "Owners can delete own events" RLS policy scopes the call.
 */
export default function DraftCard({
  draft,
  editedLabel,
}: {
  draft: EventListItem;
  /**
   * Formatted on the server — client-side date formatting can mismatch
   * the server render's locale during hydration.
   */
  editedLabel: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const category =
    EVENT_CATEGORIES.find((option) => option.value === draft.category)?.label ?? null;
  const type = EVENT_TYPES.find((option) => option.value === draft.event_type)?.label ?? null;
  const meta = [category, type].filter(Boolean).join(" · ");

  const handleDelete = async () => {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", draft.id);
    setDeleting(false);
    if (error) {
      toast.error(`Could not delete draft: ${error.message}`);
      return;
    }
    toast.success("Draft deleted");
    router.refresh();
  };

  return (
    <article className="flex flex-col justify-between gap-4 rounded-2xl border border-border p-5 dark:border-zinc-700">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-secondary-text dark:bg-zinc-800 dark:text-zinc-400">
            Draft
          </span>
          <span className="text-xs text-secondary-text dark:text-zinc-400">
            Edited {editedLabel}
          </span>
        </div>
        <h3 className="mt-2 truncate text-base font-semibold">
          {draft.name?.trim() || "Untitled event"}
        </h3>
        {meta && (
          <p className="mt-1 truncate text-sm text-secondary-text dark:text-zinc-400">{meta}</p>
        )}
        <p className="mt-0.5 text-xs text-secondary-text dark:text-zinc-400">
          Step {draft.current_step} of {TOTAL_STEPS}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {confirming ? (
          <>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting && <Spinner size="sm" className="text-white" />}
              {deleting ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="cursor-pointer rounded-lg px-2 py-2.5 text-sm font-medium text-secondary-text transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <Link
              href={`/events/create/${draft.current_step}?id=${draft.id}`}
              className="rounded-lg bg-main-orange px-4 py-2.5 text-sm font-semibold text-main-text transition-opacity hover:opacity-90"
            >
              Continue
            </Link>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="cursor-pointer rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </article>
  );
}
