"use client";

import { useState } from "react";

import QuestionEditorModal from "@/components/events/create/QuestionEditorModal";
import { ANSWER_TYPES, REGISTRATION_LIMITS } from "@/lib/events/constants";
import type {
  AttendeeQuestion,
  RegistrationData,
  RegistrationErrors,
} from "@/lib/events/types";

const ERROR_TEXT_CLASSES = "mt-1.5 text-xs text-red-500";

const inputClasses = (hasError?: string) =>
  `w-full rounded-xl border bg-transparent px-3.5 py-2.5 text-sm text-foreground placeholder:text-zinc-400 focus:outline-none dark:placeholder:text-zinc-500 ${
    hasError
      ? "border-red-500 focus:border-red-500"
      : "border-border focus:border-(--main-orange) dark:border-zinc-700"
  }`;

/** Locked base fields every attendee supplies — never editable. */
const BASE_FIELDS = ["First name", "Last name", "Email"] as const;

/** Label for a stored answer type ("dropdown" → "Dropdown"). */
function answerTypeLabel(value: string): string {
  return ANSWER_TYPES.find((type) => type.value === value)?.label ?? value;
}

/** One selectable card-style radio option (custom dot, no native ring). */
function RadioRow({
  name,
  value,
  checked,
  onChange,
  label,
  description,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  label: string;
  description?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
        checked
          ? "border-(--main-orange) bg-main-orange/5"
          : "border-border hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          checked ? "border-(--main-orange)" : "border-zinc-300 dark:border-zinc-600"
        }`}
      >
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-main-orange" />}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <span className="text-xs leading-5 text-secondary-text dark:text-zinc-400">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

/**
 * Step 3 — Registration. Status / capacity / approval drive how the
 * public side behaves; the attendee-information block pairs locked base
 * fields with organiser-defined custom questions (add / edit / remove).
 */
export default function RegistrationStep({
  data,
  errors,
  onChange,
}: {
  data: RegistrationData;
  errors: RegistrationErrors;
  onChange: (patch: Partial<RegistrationData>) => void;
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AttendeeQuestion | null>(null);

  const upsertQuestion = (question: AttendeeQuestion) => {
    const exists = data.questions.some((entry) => entry.id === question.id);
    onChange({
      questions: exists
        ? data.questions.map((entry) => (entry.id === question.id ? question : entry))
        : [...data.questions, question],
    });
    setEditorOpen(false);
    setEditing(null);
  };

  return (
    <section className="flex flex-col gap-10">
      {/* ── Registration status ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Registration</h2>
          <p className="mt-1 text-xs text-secondary-text dark:text-zinc-500">
            How do people register for this event?
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <RadioRow
            name="registration-status"
            value="open"
            checked={data.status === "open"}
            onChange={(status) => onChange({ status })}
            label="Open immediately"
            description="People can register right away"
          />
          <RadioRow
            name="registration-status"
            value="scheduled"
            checked={data.status === "scheduled"}
            onChange={(status) => onChange({ status })}
            label="Open on a specific date"
            description="Schedule when registration opens and closes"
          />
          <RadioRow
            name="registration-status"
            value="closed"
            checked={data.status === "closed"}
            onChange={(status) => onChange({ status })}
            label="Registration closed"
            description="Nobody can register for now"
          />
        </div>
        {errors.status && (
          <p data-field-error className={ERROR_TEXT_CLASSES}>
            {errors.status}
          </p>
        )}

        {data.status === "scheduled" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="registration-opens" className="text-sm font-medium">
                Registration opens <span className="text-(--main-orange)">*</span>
              </label>
              <input
                id="registration-opens"
                type="date"
                value={data.opensOn}
                onChange={(e) => onChange({ opensOn: e.target.value })}
                aria-invalid={Boolean(errors.opensOn)}
                className={`${inputClasses(errors.opensOn)} dark:[color-scheme:dark]`}
              />
              {errors.opensOn && (
                <p data-field-error className={ERROR_TEXT_CLASSES}>
                  {errors.opensOn}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="registration-closes" className="text-sm font-medium">
                Registration closes
              </label>
              <input
                id="registration-closes"
                type="date"
                value={data.closesOn}
                onChange={(e) => onChange({ closesOn: e.target.value })}
                aria-invalid={Boolean(errors.closesOn)}
                className={`${inputClasses(errors.closesOn)} dark:[color-scheme:dark]`}
              />
              {errors.closesOn && (
                <p data-field-error className={ERROR_TEXT_CLASSES}>
                  {errors.closesOn}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Capacity ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Capacity</h2>
          <p className="mt-1 text-xs text-secondary-text dark:text-zinc-500">
            How many people can attend?
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <RadioRow
            name="capacity-type"
            value="unlimited"
            checked={data.capacityType === "unlimited"}
            onChange={(capacityType) => onChange({ capacityType })}
            label="Unlimited"
            description="No cap on attendance"
          />
          <RadioRow
            name="capacity-type"
            value="limited"
            checked={data.capacityType === "limited"}
            onChange={(capacityType) => onChange({ capacityType })}
            label="Limited"
            description="Set a maximum attendee count"
          />
        </div>
        {errors.capacityType && (
          <p data-field-error className={ERROR_TEXT_CLASSES}>
            {errors.capacityType}
          </p>
        )}

        {data.capacityType === "limited" && (
          <div className="flex max-w-xs flex-col gap-1.5">
            <label htmlFor="max-attendees" className="text-sm font-medium">
              Maximum attendees <span className="text-(--main-orange)">*</span>
            </label>
            <input
              id="max-attendees"
              type="number"
              min={1}
              max={REGISTRATION_LIMITS.maxAttendeesCap}
              value={data.maxAttendees}
              onChange={(e) => onChange({ maxAttendees: e.target.value })}
              placeholder="e.g. 500"
              aria-invalid={Boolean(errors.maxAttendees)}
              className={`${inputClasses(errors.maxAttendees)} dark:[color-scheme:dark]`}
            />
            {errors.maxAttendees && (
              <p data-field-error className={ERROR_TEXT_CLASSES}>
                {errors.maxAttendees}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Approval ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Approval</h2>
          <p className="mt-1 text-xs text-secondary-text dark:text-zinc-500">
            Do registrations need your sign-off?
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <RadioRow
            name="approval-type"
            value="automatic"
            checked={data.approvalType === "automatic"}
            onChange={(approvalType) => onChange({ approvalType })}
            label="Automatically approve registrations"
            description="Registrations are confirmed instantly"
          />
          <RadioRow
            name="approval-type"
            value="manual"
            checked={data.approvalType === "manual"}
            onChange={(approvalType) => onChange({ approvalType })}
            label="Manually approve registrations"
            description="You review each registration before it's confirmed"
          />
        </div>
        {errors.approvalType && (
          <p data-field-error className={ERROR_TEXT_CLASSES}>
            {errors.approvalType}
          </p>
        )}
      </div>

      {/* ── Attendee information ────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Attendee information</h2>
          <p className="mt-1 text-xs text-secondary-text dark:text-zinc-500">
            We&rsquo;ll collect these details from everyone who registers.
          </p>
        </div>

        <div className="flex flex-col divide-y divide-border rounded-2xl border border-border dark:divide-zinc-700 dark:border-zinc-700">
          {/* Locked base rows — always collected, always required. */}
          {BASE_FIELDS.map((field) => (
            <div key={field} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-main-orange/10 text-(--main-orange)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    className="h-3.5 w-3.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </span>
                <span className="text-sm font-medium">{field}</span>
              </div>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-secondary-text dark:bg-zinc-800 dark:text-zinc-400">
                Required
              </span>
            </div>
          ))}

          {/* Custom organiser-defined questions — editable, removable. */}
          {data.questions.map((question) => (
            <div
              key={question.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-3.5 w-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                    />
                  </svg>
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{question.label}</span>
                  <span className="text-xs text-secondary-text dark:text-zinc-500">
                    {answerTypeLabel(question.answerType)}
                    {question.required ? " · Required" : " · Optional"}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(question);
                    setEditorOpen(true);
                  }}
                  aria-label={`Edit question: ${question.label}`}
                  className="cursor-pointer rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      questions: data.questions.filter((entry) => entry.id !== question.id),
                    })
                  }
                  aria-label={`Remove question: ${question.label}`}
                  className="cursor-pointer rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {data.questions.length === 0 && (
          <p className="text-xs text-secondary-text dark:text-zinc-500">
            No extra questions yet — attendees will only be asked for the basics above.
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
          disabled={data.questions.length >= REGISTRATION_LIMITS.maxQuestions}
          className="self-start cursor-pointer rounded-lg border border-dashed border-border px-4 py-2 text-sm font-medium text-secondary-text transition-colors hover:border-zinc-400 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
        >
          + Add question
        </button>
        {errors.questions && (
          <p data-field-error className={ERROR_TEXT_CLASSES}>
            {errors.questions}
          </p>
        )}
      </div>

      {/* Add / edit dialog — keyed so each question gets fresh state. */}
      {editorOpen && (
        <QuestionEditorModal
          key={editing?.id ?? "new-question"}
          question={editing}
          onClose={() => {
            setEditorOpen(false);
            setEditing(null);
          }}
          onSubmit={upsertQuestion}
        />
      )}
    </section>
  );
}
