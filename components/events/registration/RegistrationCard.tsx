"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import Spinner from "@/components/ui/Spinner";
import { formatDate, localToday } from "@/lib/dates";
import { ticketPriceLabel, type PublicTicket } from "@/lib/events/public";
import {
  buildAnswersPayload,
  emptyRegistrationForm,
  registrationErrorMessage,
  validateRegistrationForm,
  type RegistrationFormErrors,
  type RegistrationFormState,
} from "@/lib/events/registration";
import type { AttendeeQuestion } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/client";

/* ── Shared input styling (mirrors the auth forms / wizard inputs) ─────── */

const inputClasses = (hasError: boolean | undefined) =>
  `w-full rounded-xl border bg-transparent px-3 py-2.5 text-sm focus:outline-none ${
    hasError
      ? "border-red-400 focus:border-red-500 dark:border-red-500"
      : "border-zinc-300 focus:border-(--main-orange) dark:border-zinc-700"
  }`;

/** One custom question rendered by answerType. */
function QuestionField({
  question,
  value,
  error,
  onChange,
}: {
  question: AttendeeQuestion;
  value: string | string[] | undefined;
  error: string | undefined;
  onChange: (answer: string | string[]) => void;
}) {
  const id = `question-${question.id}`;
  const text = Array.isArray(value) ? value.join(", ") : (value ?? "");

  const toggleCheckbox = (option: string) => {
    const current = Array.isArray(value) ? value : [];
    onChange(current.includes(option) ? current.filter((v) => v !== option) : [...current, option]);
  };

  let field: React.ReactNode;
  switch (question.answerType) {
    case "long_answer":
      field = (
        <textarea
          id={id}
          rows={3}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses(Boolean(error))}
        />
      );
      break;
    case "email":
      field = (
        <input
          id={id}
          type="email"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses(Boolean(error))}
        />
      );
      break;
    case "phone":
      field = (
        <input
          id={id}
          type="tel"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses(Boolean(error))}
        />
      );
      break;
    case "number":
      field = (
        <input
          id={id}
          type="number"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses(Boolean(error))}
        />
      );
      break;
    case "dropdown":
      field = (
        <select
          id={id}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClasses(Boolean(error))} cursor-pointer bg-background dark:bg-zinc-900`}
        >
          <option value="">Choose…</option>
          {question.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
      break;
    case "multiple_choice":
      field = (
        <div className="flex flex-col gap-2">
          {question.options.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name={id}
                checked={text === option}
                onChange={() => onChange(option)}
                className="h-4 w-4 accent-(--main-orange)"
              />
              {option}
            </label>
          ))}
        </div>
      );
      break;
    case "checkbox":
      field = (
        <div className="flex flex-col gap-2">
          {question.options.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Array.isArray(value) && value.includes(option)}
                onChange={() => toggleCheckbox(option)}
                className="h-4 w-4 accent-(--main-orange)"
              />
              {option}
            </label>
          ))}
        </div>
      );
      break;
    default: // short_answer
      field = (
        <input
          id={id}
          type="text"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses(Boolean(error))}
        />
      );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {question.label}
        {question.required && <span className="text-(--main-orange)"> *</span>}
      </label>
      {field}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/** Status card shown to someone who already registered. */
function ExistingRegistrationCard({
  status,
  meetingLink,
  meetingId,
  confirmCancel,
  cancelling,
  onCancelClick,
  onCancelConfirm,
  onCancelDismiss,
  onRegisterAgain,
}: {
  status: string;
  meetingLink: string | null;
  meetingId: string | null;
  confirmCancel: boolean;
  cancelling: boolean;
  onCancelClick: () => void;
  onCancelConfirm: () => void;
  onCancelDismiss: () => void;
  onRegisterAgain: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {status === "approved" && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          You&apos;re registered — see you there!
        </div>
      )}
      {status === "pending" && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          Registration submitted — waiting for the organizer&apos;s approval.
        </div>
      )}
      {status === "rejected" && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
          The organizer declined this registration.
        </div>
      )}
      {status === "cancelled" && (
        <>
          <div className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-secondary-text dark:bg-zinc-800 dark:text-zinc-400">
            You cancelled your registration.
          </div>
          <button
            type="button"
            onClick={onRegisterAgain}
            className="cursor-pointer rounded-lg bg-main-orange px-4 py-2.5 text-sm font-semibold text-main-text transition-opacity hover:opacity-90"
          >
            Register again
          </button>
        </>
      )}

      {/* Meeting details — only fetched for approved attendees of online/hybrid events. */}
      {status === "approved" && (meetingLink || meetingId) && (
        <div className="rounded-xl border border-border px-4 py-3 text-sm dark:border-zinc-700">
          <p className="font-semibold">Join details</p>
          {meetingLink && (
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate text-(--main-orange) hover:underline"
            >
              {meetingLink}
            </a>
          )}
          {meetingId && (
            <p className="mt-1 text-secondary-text dark:text-zinc-400">Meeting ID: {meetingId}</p>
          )}
        </div>
      )}

      {(status === "approved" || status === "pending") &&
        (confirmCancel ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancelConfirm}
              disabled={cancelling}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelling && <Spinner size="sm" className="text-white" />}
              {cancelling ? "Cancelling…" : "Confirm cancel"}
            </button>
            <button
              type="button"
              onClick={onCancelDismiss}
              disabled={cancelling}
              className="cursor-pointer rounded-lg px-2 py-2.5 text-sm font-medium text-secondary-text transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Keep registration
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onCancelClick}
            className="cursor-pointer self-start text-sm font-medium text-secondary-text underline-offset-4 transition-colors hover:text-red-600 hover:underline dark:text-zinc-400 dark:hover:text-red-400"
          >
            Cancel my registration
          </button>
        ))}
    </div>
  );
}

/**
 * The registration section of the public event page. Every state the
 * attendee can hit — draft preview, cancelled/expired event, scheduled or
 * closed registration, full capacity, an existing registration
 * (approved / pending / rejected / cancelled) — resolves to a clear
 * message, and the open state renders the form (identity + ticket choice
 * + the organizer's custom questions). No account is needed: email is
 * the identity anchor and the register_attendee RPC re-checks everything
 * server-side. Signed-in users get their details prefilled and their
 * registration linked to their account.
 */
export default function RegistrationCard({
  eventId,
  draftPreview,
  cancelled,
  expired,
  registrationStatus,
  registrationOpens,
  registrationCloses,
  capacityType,
  maxAttendees,
  activeCount,
  approvalType,
  questions,
  tickets,
  existing,
  viewer,
  meetingLink,
  meetingId,
}: {
  eventId: string;
  draftPreview: boolean;
  cancelled: boolean;
  expired: boolean;
  registrationStatus: string;
  registrationOpens: string | null;
  registrationCloses: string | null;
  capacityType: string;
  maxAttendees: number | null;
  activeCount: number;
  approvalType: string;
  questions: AttendeeQuestion[];
  tickets: PublicTicket[];
  existing: { id: string; status: string } | null;
  viewer: { firstName: string; lastName: string; email: string } | null;
  meetingLink: string | null;
  meetingId: string | null;
}) {
  const router = useRouter();

  const [form, setForm] = useState<RegistrationFormState>(() => ({
    ...emptyRegistrationForm(viewer),
    // A single ticket type is the obvious choice — preselect it.
    ticketId: tickets.length === 1 ? (tickets[0]!.id as string) : "",
  }));
  const [errors, setErrors] = useState<RegistrationFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  // Re-registering after cancelling — bring the form back.
  const [showFormAfterCancel, setShowFormAfterCancel] = useState(false);

  const today = localToday();
  const isFull =
    capacityType === "limited" && maxAttendees != null && activeCount >= maxAttendees;
  const notYetOpen =
    registrationStatus === "scheduled" && (!registrationOpens || registrationOpens > today);
  const windowClosed =
    registrationStatus === "closed" ||
    (registrationStatus === "scheduled" &&
      registrationCloses != null &&
      registrationCloses < today);

  const handleCancelConfirm = async () => {
    if (!existing || cancelling) return;
    setCancelling(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("event_registrations")
      .update({ status: "cancelled" })
      .eq("id", existing.id);
    setCancelling(false);
    if (error) {
      toast.error(`Could not cancel: ${error.message}`);
      return;
    }
    toast.success("Registration cancelled");
    setConfirmCancel(false);
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const validation = validateRegistrationForm(form, questions, tickets);
    setErrors(validation);
    if (
      validation.firstName ||
      validation.lastName ||
      validation.email ||
      validation.ticketId ||
      validation.answers
    ) {
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("register_attendee", {
      p_event_id: eventId,
      p_first_name: form.firstName.trim(),
      p_last_name: form.lastName.trim(),
      p_email: form.email.trim(),
      p_ticket_id: form.ticketId || null,
      p_answers: buildAnswersPayload(form, questions),
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message || registrationErrorMessage(""));
      return;
    }
    const result = data as { ok?: boolean; status?: string; error?: string } | null;
    if (!result || result.ok !== true) {
      toast.error(registrationErrorMessage(result?.error ?? ""));
      // The server state knows better (e.g. already registered) — resync.
      if (result?.error === "already_registered") router.refresh();
      return;
    }
    toast.success(
      result.status === "pending"
        ? "Registration submitted — awaiting the organizer's approval"
        : "You're registered — see you there!"
    );
    router.refresh();
  };

  const spotsLine =
    capacityType === "limited" && maxAttendees != null
      ? `${activeCount.toLocaleString("en-US")} of ${maxAttendees.toLocaleString("en-US")} spots filled`
      : `${activeCount.toLocaleString("en-US")} registered`;

  return (
    <section
      aria-labelledby="registration-heading"
      className="rounded-2xl border border-border p-5 dark:border-zinc-700"
    >
      <h2 id="registration-heading" className="text-lg font-semibold tracking-tight">
        Registration
      </h2>
      <p className="mt-1 text-sm text-secondary-text dark:text-zinc-400">{spotsLine}</p>

      <div className="mt-4">
        {/* Owner previewing a draft — nothing works until it's published. */}
        {draftPreview && (
          <div className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-secondary-text dark:bg-zinc-800 dark:text-zinc-400">
            This is a draft preview — publish the event to open registrations.
          </div>
        )}

        {/* Hard stops — event state wins over everything else. */}
        {!draftPreview && cancelled && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
            This event has been cancelled by the organizer.
          </div>
        )}
        {!draftPreview && !cancelled && expired && (
          <div className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-secondary-text dark:bg-zinc-800 dark:text-zinc-400">
            This event has ended — registration is closed.
          </div>
        )}

        {/* The attendee's own registration, when they have one. */}
        {!draftPreview && !cancelled && !expired && existing && !showFormAfterCancel && (
          <ExistingRegistrationCard
            status={existing.status}
            meetingLink={meetingLink}
            meetingId={meetingId}
            confirmCancel={confirmCancel}
            cancelling={cancelling}
            onCancelClick={() => setConfirmCancel(true)}
            onCancelConfirm={handleCancelConfirm}
            onCancelDismiss={() => setConfirmCancel(false)}
            onRegisterAgain={() => setShowFormAfterCancel(true)}
          />
        )}

        {/* No registration yet — gate messaging before the form. */}
        {!draftPreview && !cancelled && !expired && (!existing || showFormAfterCancel) && windowClosed && (
          <div className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-secondary-text dark:bg-zinc-800 dark:text-zinc-400">
            Registration is closed.
          </div>
        )}
        {!draftPreview &&
          !cancelled &&
          !expired &&
          (!existing || showFormAfterCancel) &&
          !windowClosed &&
          notYetOpen && (
            <div className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-secondary-text dark:bg-zinc-800 dark:text-zinc-400">
              {registrationOpens
                ? `Registration opens ${formatDate(registrationOpens)}.`
                : "Registration hasn't opened yet."}
            </div>
          )}
        {!draftPreview &&
          !cancelled &&
          !expired &&
          (!existing || showFormAfterCancel) &&
          !windowClosed &&
          !notYetOpen &&
          isFull && (
            <div className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-secondary-text dark:bg-zinc-800 dark:text-zinc-400">
              This event is full.
            </div>
          )}

        {/* The form — no account needed; email is the identity anchor. */}
        {!draftPreview &&
          !cancelled &&
          !expired &&
          (!existing || showFormAfterCancel) &&
          !windowClosed &&
          !notYetOpen &&
          !isFull && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-first-name" className="text-sm font-medium">
                    First name <span className="text-(--main-orange)">*</span>
                  </label>
                  <input
                    id="reg-first-name"
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    className={inputClasses(Boolean(errors.firstName))}
                  />
                  {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-last-name" className="text-sm font-medium">
                    Last name <span className="text-(--main-orange)">*</span>
                  </label>
                  <input
                    id="reg-last-name"
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    className={inputClasses(Boolean(errors.lastName))}
                  />
                  {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-email" className="text-sm font-medium">
                  Email <span className="text-(--main-orange)">*</span>
                </label>
                <input
                  id="reg-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className={inputClasses(Boolean(errors.email))}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                {!viewer && (
                  <p className="text-xs text-secondary-text dark:text-zinc-400">
                    No account needed — if you sign up later with this email,
                    this registration links to it automatically.
                  </p>
                )}
              </div>

              {tickets.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">
                    Ticket <span className="text-(--main-orange)">*</span>
                  </span>
                  {tickets.map((ticket) => (
                    <label
                      key={ticket.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                        form.ticketId === ticket.id
                          ? "border-(--main-orange) bg-orange-50/60 dark:bg-orange-500/10"
                          : "border-zinc-300 dark:border-zinc-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reg-ticket"
                        checked={form.ticketId === ticket.id}
                        onChange={() => setForm((prev) => ({ ...prev, ticketId: ticket.id }))}
                        className="mt-0.5 h-4 w-4 accent-(--main-orange)"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium">{ticket.name}</span>
                          <span className="text-secondary-text dark:text-zinc-400">
                            {ticketPriceLabel(ticket)}
                          </span>
                        </span>
                        {ticket.description && (
                          <span className="mt-0.5 block text-xs text-secondary-text dark:text-zinc-400">
                            {ticket.description}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                  {errors.ticketId && <p className="text-xs text-red-500">{errors.ticketId}</p>}
                </div>
              )}

              {questions.map((question) => (
                <QuestionField
                  key={question.id}
                  question={question}
                  value={form.answers[question.id]}
                  error={errors.answers?.[question.id]}
                  onChange={(answer) =>
                    setForm((prev) => ({
                      ...prev,
                      answers: { ...prev.answers, [question.id]: answer },
                    }))
                  }
                />
              ))}

              {approvalType === "manual" && (
                <p className="text-xs text-secondary-text dark:text-zinc-400">
                  Registrations are reviewed by the organizer before they&apos;re confirmed.
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-main-orange px-4 py-2.5 text-sm font-semibold text-main-text transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Spinner size="sm" className="text-white" />}
                {submitting ? "Registering…" : "Register"}
              </button>
              {(errors.firstName || errors.lastName || errors.email || errors.ticketId || errors.answers) && (
                <p className="text-xs text-red-500">Please fix the highlighted fields above.</p>
              )}
            </form>
          )}
      </div>
    </section>
  );
}


