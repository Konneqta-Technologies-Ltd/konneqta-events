import {
  ACCESSIBILITY_OPTIONS,
  AGE_RESTRICTION_OPTIONS,
  EVENT_CATEGORIES,
  EVENT_TYPES,
  MEETING_PLATFORMS,
} from "@/lib/events/constants";
import type {
  BasicInfoData,
  EventDetailsData,
  RegistrationData,
  ScheduleLocationData,
  TicketData,
} from "@/lib/events/types";

/* ── Label helpers (value → human text) ────────────────────────────────── */

/** Build a value → label lookup from one of the const option lists. */
function labelMap(
  options: ReadonlyArray<{ value: string; label: string }>
): Map<string, string> {
  return new Map(options.map((option): [string, string] => [option.value, option.label]));
}

const CATEGORY_LABEL = labelMap(EVENT_CATEGORIES);
const TYPE_LABEL = labelMap(EVENT_TYPES);
const PLATFORM_LABEL = labelMap(MEETING_PLATFORMS);
const ACCESSIBILITY_LABEL = labelMap(ACCESSIBILITY_OPTIONS);

const REGISTRATION_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  scheduled: "Scheduled",
  closed: "Closed",
};

const CAPACITY_LABEL: Record<string, string> = {
  unlimited: "Unlimited",
  limited: "Limited",
};

const APPROVAL_LABEL: Record<string, string> = {
  automatic: "Automatic",
  manual: "Manual approval",
};

/** Age option label, appending the custom note when "Custom" is picked. */
function ageLabel(details: EventDetailsData): string | null {
  const label =
    details.ageRestriction === "custom"
      ? details.ageRestrictionCustom.trim() || "Custom"
      : AGE_RESTRICTION_OPTIONS.find((option) => option.value === details.ageRestriction)?.label;
  return label ?? null;
}

/** Free-form date label for review rows (empty → null so rows hide). */
function reviewDate(value: string): string | null {
  return value ? value : null;
}

/* ── Layout primitives ─────────────────────────────────────────────────── */

/** One section of the review — title, Edit link back to the step, rows. */
function ReviewSection({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border p-5 dark:border-zinc-700">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          Edit
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
            />
          </svg>
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </section>
  );
}

/** Label + value row; renders nothing when the value is empty. */
function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-xs font-medium uppercase tracking-wide text-secondary-text dark:text-zinc-500">
        {label}
      </dt>
      <dd className="whitespace-pre-line text-sm leading-6 text-foreground">{value}</dd>
    </div>
  );
}

/* ── The step ──────────────────────────────────────────────────────────── */

/**
 * Step 6 — Review & Publish. A read-only, top-to-bottom summary of
 * everything entered in Steps 1–5; each section's Edit link jumps back
 * to its step (plain navigation — nothing is editable here, so nothing
 * can be lost). Publishing itself is the wizard footer's job.
 */
export default function ReviewStep({
  data,
  schedule,
  registration,
  tickets,
  details,
  onEdit,
}: {
  data: BasicInfoData;
  schedule: ScheduleLocationData;
  registration: RegistrationData;
  tickets: TicketData[];
  details: EventDetailsData;
  onEdit: (step: number) => void;
}) {
  const isOnline = data.eventType === "online" || data.eventType === "hybrid";
  const isVenue = data.eventType === "in_person" || data.eventType === "hybrid";

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">Review &amp; Publish</h2>
        <p className="mt-1 text-sm text-secondary-text dark:text-zinc-400">
          Everything entered so far, top to bottom. Edit any section that needs
          a tweak — then publish when it all looks right.
        </p>
      </div>
      {/* Step 1 — Basic Information */}
      <ReviewSection title="Basic Information" step={1} onEdit={onEdit}>
        <Row label="Name" value={data.name.trim() || null} />
        <Row label="Theme" value={data.theme.trim() || null} />
        <Row
          label="Category"
          value={
            data.category === "other" && data.categoryOther.trim()
              ? `Other — ${data.categoryOther.trim()}`
              : CATEGORY_LABEL.get(data.category) ?? null
          }
        />
        <Row label="Type" value={TYPE_LABEL.get(data.eventType) ?? null} />
        {data.hashtags.length > 0 && <Row label="Hashtags" value={data.hashtags.join(", ")} />}
        <Row label="Description" value={data.description.trim() || null} />
      </ReviewSection>

      {/* Step 2 — Date, Time & Location */}
      <ReviewSection title="Date, Time & Location" step={2} onEdit={onEdit}>
        <Row
          label="Date"
          value={
            schedule.startDate
              ? schedule.endDate && schedule.endDate !== schedule.startDate
                ? `${schedule.startDate} – ${schedule.endDate}`
                : schedule.startDate
              : null
          }
        />
        <Row
          label="Time"
          value={
            schedule.startTime
              ? `${schedule.startTime}${schedule.endTime ? ` – ${schedule.endTime}` : ""}${
                  schedule.timezone ? ` (${schedule.timezone})` : ""
                }`
              : null
          }
        />
        {isVenue && (
          <>
            <Row label="Venue" value={schedule.venueName.trim() || null} />
            <Row
              label="Address"
              value={
                [schedule.venueAddress, schedule.venueCity, schedule.venueCountry]
                  .filter(Boolean)
                  .join(", ") || null
              }
            />
            <Row label="Map" value={schedule.mapLocation.trim() || null} />
          </>
        )}
        {isOnline && (
          <>
            <Row
              label="Platform"
              value={PLATFORM_LABEL.get(schedule.platform) ?? (schedule.platform || null)}
            />
            <Row label="Meeting link" value={schedule.meetingLink.trim() || null} />
            <Row label="Meeting ID" value={schedule.meetingId.trim() || null} />
          </>
        )}
      </ReviewSection>

      {/* Step 3 — Registration */}
      <ReviewSection title="Registration" step={3} onEdit={onEdit}>
        <Row label="Status" value={REGISTRATION_STATUS_LABEL[registration.status] ?? null} />
        {registration.status === "scheduled" && (
          <>
            <Row label="Opens" value={reviewDate(registration.opensOn)} />
            <Row label="Closes" value={reviewDate(registration.closesOn)} />
          </>
        )}
        <Row
          label="Capacity"
          value={
            registration.capacityType === "limited" && registration.maxAttendees.trim()
              ? `Limited — ${Number(registration.maxAttendees).toLocaleString("en-US")} attendees`
              : CAPACITY_LABEL[registration.capacityType] ?? null
          }
        />
        <Row label="Approval" value={APPROVAL_LABEL[registration.approvalType] ?? null} />
        {registration.questions.length > 0 && (
          <Row
            label="Questions"
            value={`${registration.questions.length} custom — ${registration.questions
              .map((question) => question.label)
              .join(", ")}`}
          />
        )}
      </ReviewSection>

      {/* Step 4 — Tickets */}
      <ReviewSection title="Tickets" step={4} onEdit={onEdit}>
        {tickets.length === 0 ? (
          <p className="text-sm text-secondary-text dark:text-zinc-400">
            No ticket types yet — add at least one before publishing.
          </p>
        ) : (
          tickets.map((ticket) => {
            const price = ticket.price.trim();
            const priceLabel =
              price === "" || Number(price) === 0 ? "Free" : `${ticket.currency} ${price}`;
            const sales =
              ticket.salesStart || ticket.salesEnd
                ? ` · sales ${ticket.salesStart || "…"} → ${ticket.salesEnd || "…"}`
                : "";
            return (
              <div key={ticket.id} className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                <dt className="w-44 shrink-0 text-xs font-medium uppercase tracking-wide text-secondary-text dark:text-zinc-500">
                  {ticket.name.trim() || "Untitled ticket"}
                </dt>
                <dd className="text-sm leading-6 text-foreground">
                  {priceLabel} · {ticket.quantity.trim() || "—"} available{sales}
                </dd>
              </div>
            );
          })
        )}
      </ReviewSection>

      {/* Step 5 — Event Details */}
      <ReviewSection title="Event Details" step={5} onEdit={onEdit}>
        <Row label="Who should attend" value={details.whoShouldAttend.trim() || null} />
        <Row label="What to expect" value={details.whatToExpect.trim() || null} />
        <Row label="Requirements" value={details.requirements.trim() || null} />
        <Row label="Dress code" value={details.dressCode.trim() || null} />
        {details.accessibility.length > 0 && (
          <Row
            label="Accessibility"
            value={details.accessibility
              .map((value) => ACCESSIBILITY_LABEL.get(value) ?? value)
              .join(", ")}
          />
        )}
        <Row label="Additional info" value={details.additionalInfo.trim() || null} />
        <Row label="Age requirement" value={ageLabel(details)} />
      </ReviewSection>
    </section>
  );
}

