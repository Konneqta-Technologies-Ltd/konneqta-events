"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import Spinner from "@/components/ui/Spinner";
import { formatDateTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";

/** One registration row as the organizer page selects it. */
export type RegistrationRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  ticket_id: string | null;
  answers: unknown; // jsonb array of { questionId, label, answerType, answer }
  created_at: string;
};

/** Answer rows stored on a registration (mirrors attendee_questions). */
type StoredAnswer = {
  questionId: string;
  label: string;
  answerType: string;
  answer: string | string[];
};

/** Safely coerce the jsonb answers column into displayable rows. */
function parseAnswers(value: unknown): StoredAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const answer = record.answer;
    return [
      {
        questionId: typeof record.questionId === "string" ? record.questionId : "",
        label: typeof record.label === "string" ? record.label : "",
        answerType: typeof record.answerType === "string" ? record.answerType : "short_answer",
        answer: Array.isArray(answer)
          ? answer.filter((item): item is string => typeof item === "string")
          : typeof answer === "string"
            ? answer
            : "",
      },
    ];
  });
}

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
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/** Status filter tabs — "All" plus each status with a live count. */
const FILTERS = ["all", "pending", "approved", "rejected", "cancelled"] as const;
type Filter = (typeof FILTERS)[number];

/**
 * The organizer's registrations table — filter tabs with counts, one card
 * per attendee (identity, ticket, answers, registered-at), approve/reject
 * actions on pending rows, and a CSV export of the current view.
 */
export default function RegistrationsTable({
  registrations,
  ticketNames,
}: {
  registrations: RegistrationRow[];
  ticketNames: Record<string, string>;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const counts: Record<string, number> = { all: registrations.length };
  for (const row of registrations) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }

  const visible =
    filter === "all" ? registrations : registrations.filter((row) => row.status === filter);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    if (updating) return;
    setUpdating(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("event_registrations")
      .update({ status })
      .eq("id", id);
    setUpdating(null);
    if (error) {
      toast.error(`Could not update: ${error.message}`);
      return;
    }
    toast.success(status === "approved" ? "Registration approved" : "Registration rejected");
    router.refresh();
  };

  const exportCsv = () => {
    const header = ["First name", "Last name", "Email", "Ticket", "Status", "Registered at"];
    const questionLabels = Array.from(
      new Set(visible.flatMap((row) => parseAnswers(row.answers).map((a) => a.label)))
    ).filter(Boolean);
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

    const lines = [
      [...header, ...questionLabels].map(escape).join(","),
      ...visible.map((row) => {
        const answers = parseAnswers(row.answers);
        const cells = [
          row.first_name,
          row.last_name,
          row.email,
          row.ticket_id ? (ticketNames[row.ticket_id] ?? "") : "",
          row.status,
          formatDateTime(row.created_at),
          ...questionLabels.map((label) => {
            const found = answers.find((a) => a.label === label);
            return found
              ? Array.isArray(found.answer)
                ? found.answer.join("; ")
                : found.answer
              : "";
          }),
        ];
        return cells.map(escape).join(",");
      }),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (registrations.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-border px-6 py-16 text-center dark:border-zinc-700">
        <h2 className="text-lg font-semibold">No registrations yet</h2>
        <p className="mt-2 text-sm text-secondary-text dark:text-zinc-400">
          When people register for this event they&apos;ll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Filter tabs + export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
          {FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={filter === option}
              onClick={() => setFilter(option)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                filter === option
                  ? "bg-foreground text-background"
                  : "bg-zinc-100 text-secondary-text hover:text-foreground dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {option} ({counts[option] ?? 0})
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Export CSV
        </button>
      </div>

      {/* Rows */}
      <div className="mt-4 flex flex-col gap-3">
        {visible.length === 0 && (
          <p className="py-8 text-center text-sm text-secondary-text dark:text-zinc-400">
            Nothing under this filter.
          </p>
        )}
        {visible.map((row) => {
          const answers = parseAnswers(row.answers);
          const isOpen = expanded === row.id;
          return (
            <article
              key={row.id}
              className="rounded-2xl border border-border p-4 dark:border-zinc-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {row.first_name} {row.last_name}
                  </p>
                  <p className="truncate text-sm text-secondary-text dark:text-zinc-400">
                    {row.email}
                  </p>
                  <p className="mt-1 text-xs text-secondary-text dark:text-zinc-400">
                    {row.ticket_id ? (ticketNames[row.ticket_id] ?? "Ticket") : "No ticket"}
                    {" · "}
                    Registered {formatDateTime(row.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={row.status} />
                  {row.status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setStatus(row.id, "approved")}
                        disabled={updating === row.id}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updating === row.id && <Spinner size="sm" className="text-white" />}
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus(row.id, "rejected")}
                        disabled={updating === row.id}
                        className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              {answers.length > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : row.id)}
                    aria-expanded={isOpen}
                    className="cursor-pointer text-xs font-medium text-(--main-orange) hover:underline"
                  >
                    {isOpen ? "Hide answers" : `Answers (${answers.length})`}
                  </button>
                  {isOpen && (
                    <dl className="mt-2 flex flex-col gap-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
                      {answers.map((answer) => (
                        <div key={answer.questionId || answer.label}>
                          <dt className="text-xs font-medium">{answer.label}</dt>
                          <dd className="text-sm text-secondary-text dark:text-zinc-400">
                            {Array.isArray(answer.answer)
                              ? answer.answer.join(", ") || "—"
                              : answer.answer || "—"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

