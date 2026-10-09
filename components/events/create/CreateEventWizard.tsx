"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";

import Stepper from "@/components/events/create/Stepper";
import BasicInfoStep from "@/components/events/create/steps/BasicInfoStep";
import DateTimeLocationStep from "@/components/events/create/steps/DateTimeLocationStep";
import EventDetailsStep from "@/components/events/create/steps/EventDetailsStep";
import RegistrationStep from "@/components/events/create/steps/RegistrationStep";
import ReviewStep from "@/components/events/create/steps/ReviewStep";
import TicketsStep from "@/components/events/create/steps/TicketsStep";
import Spinner from "@/components/ui/Spinner";
import { DEFAULT_TICKET_CURRENCY, TOTAL_STEPS, WIZARD_STEPS } from "@/lib/events/constants";
import {
  emptyBasicInfo,
  emptyEventDetails,
  emptyRegistration,
  emptyScheduleLocation,
  type BasicInfoData,
  type BasicInfoErrors,
  type EventDetailsData,
  type EventDetailsErrors,
  type EventDraft,
  type RegistrationData,
  type RegistrationErrors,
  type ScheduleLocationData,
  type ScheduleLocationErrors,
  type TicketData,
  type TicketsErrors,
} from "@/lib/events/types";
import {
  validateBasicInfo,
  validateEventDetails,
  validateRegistration,
  validateScheduleLocation,
  validateTickets,
} from "@/lib/events/validation";
import { createClient } from "@/lib/supabase/client";

/** What the wizard is currently saving for (drives button spinners/labels). */
type SaveIntent = "draft" | "continue" | "jump" | "finish" | "publish";

const SECONDARY_BUTTON_CLASSES =
  "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800";
const PRIMARY_BUTTON_CLASSES =
  "flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-main-orange px-6 py-2.5 text-sm font-semibold text-main-text transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Guarantee the browser client holds a live session before a write.
 * getSession() is a local cookie read (the same call AuthPanel trusts);
 * when the stored access token is expired — e.g. a tab left open past the
 * 1-hour token TTL that the proxy hasn't refreshed — a single
 * refreshSession() renews it. Returns the session's user id, or null when
 * no usable session can be established.
 */
async function ensureFreshSession(
  supabase: SupabaseClient
): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  // expires_at is in seconds — only trust tokens still in their window.
  if ((session.expires_at ?? 0) * 1000 > Date.now()) {
    return session.user.id;
  }

  const { data } = await supabase.auth.refreshSession();
  return data.session?.user.id ?? null;
}

/**
 * Create-event wizard shell — one URL per step (/events/create/1 … 6).
 * Owns the Step 1 "Basic Information" form state and the draft save: the
 * first save inserts a public.events row, and from then on the event id
 * rides in the URL (?id=…) so refresh, back and forward all resume the
 * same draft. Steps 2–6 are placeholders this milestone.
 */
export default function CreateEventWizard({
  step,
  draft,
  ownerId,
}: {
  step: number;
  draft: EventDraft | null;
  /** Signed-in owner id from the server page — storage paths + owner_id. */
  ownerId: string;
}) {
  const router = useRouter();

  const [data, setData] = useState<BasicInfoData>(draft?.basicInfo ?? emptyBasicInfo());
  const [errors, setErrors] = useState<BasicInfoErrors>({});
  // Step 2 — Date, Time & Location (validated and saved alongside Step 1).
  const [schedule, setSchedule] = useState<ScheduleLocationData>(
    draft?.schedule ?? emptyScheduleLocation()
  );
  const [scheduleErrors, setScheduleErrors] = useState<ScheduleLocationErrors>({});
  // Step 3 — Registration (status, capacity, approval, custom questions).
  const [registration, setRegistration] = useState<RegistrationData>(
    draft?.registration ?? emptyRegistration()
  );
  const [registrationErrors, setRegistrationErrors] = useState<RegistrationErrors>({});
  // Step 4 — Tickets (own table, synced on every save).
  const [tickets, setTickets] = useState<TicketData[]>(draft?.tickets ?? []);
  const [ticketsErrors, setTicketsErrors] = useState<TicketsErrors>({});
  // Step 5 — Event Details (public-page content columns on events).
  const [details, setDetails] = useState<EventDetailsData>(
    draft?.details ?? emptyEventDetails()
  );
  const [detailsErrors, setDetailsErrors] = useState<EventDetailsErrors>({});
  const [eventId, setEventId] = useState<string | null>(draft?.id ?? null);
  // Steps up to here are clickable in the Stepper (a draft remembers how
  // far its owner had got).
  const [maxVisited, setMaxVisited] = useState(Math.max(step, draft?.currentStep ?? 1));
  const [savingIntent, setSavingIntent] = useState<SaveIntent | null>(null);

  const busy = savingIntent !== null;

  // Scroll the first visible invalid field into view whenever a new round
  // of validation errors lands (errors on steps not being shown simply
  // match nothing).
  useEffect(() => {
    if (Object.keys(errors).length === 0 && Object.keys(scheduleErrors).length === 0) return;
    document
      .querySelector<HTMLElement>("[data-field-error]")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [errors, scheduleErrors]);

  /** URL for a wizard step — carries the draft id once one exists. */
  const stepHref = (target: number, id: string | null) =>
    id ? `/events/create/${target}?id=${id}` : `/events/create/${target}`;

  /** Patch form fields and clear any field errors the patch addresses. */
  const update = (patch: Partial<BasicInfoData>) => {
    setData((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const keys = Object.keys(patch) as (keyof BasicInfoErrors)[];
      if (!keys.some((key) => prev[key])) return prev;
      const next = { ...prev };
      for (const key of keys) delete next[key];
      return next;
    });
  };

  /** Step-2 twin of update() — patch fields, clear addressed errors. */
  const updateSchedule = (patch: Partial<ScheduleLocationData>) => {
    setSchedule((prev) => ({ ...prev, ...patch }));
    setScheduleErrors((prev) => {
      const keys = Object.keys(patch) as (keyof ScheduleLocationErrors)[];
      if (!keys.some((key) => prev[key])) return prev;
      const next = { ...prev };
      for (const key of keys) delete next[key];
      return next;
    });
  };

  /** Step-3 twin — same patch-and-clear-errors behaviour. */
  const updateRegistration = (patch: Partial<RegistrationData>) => {
    setRegistration((prev) => ({ ...prev, ...patch }));
    setRegistrationErrors((prev) => {
      const keys = Object.keys(patch) as (keyof RegistrationErrors)[];
      if (!keys.some((key) => prev[key])) return prev;
      const next = { ...prev };
      for (const key of keys) delete next[key];
      return next;
    });
  };

  /** Step-4 twin — replace the ticket list, clearing ticket errors. */
  const updateTickets = (next: TicketData[]) => {
    setTickets(next);
    setTicketsErrors({});
  };

  /** Step-5 twin of update() — patch fields, clear addressed errors. */
  const updateDetails = (patch: Partial<EventDetailsData>) => {
    setDetails((prev) => ({ ...prev, ...patch }));
    setDetailsErrors((prev) => {
      const keys = Object.keys(patch) as (keyof EventDetailsErrors)[];
      if (!keys.some((key) => prev[key])) return prev;
      const next = { ...prev };
      for (const key of keys) delete next[key];
      return next;
    });
  };

  /** Validate one step's form → error map ({} when clean). */
  const validateStep = (n: number, mode: "draft" | "continue"): Record<string, unknown> => {
    if (n === 1) return validateBasicInfo(data, mode);
    if (n === 2) {
      // No type picked in Step 1 yet → the venue block is the default.
      return validateScheduleLocation(schedule, data.eventType || "in_person", mode);
    }
    if (n === 3) return validateRegistration(registration, mode);
    if (n === 4) return validateTickets(tickets, mode);
    if (n === 5) return validateEventDetails(details, mode);
    return {}; // placeholder steps hold nothing
  };

  /** Route an error map to the owning step's state. */
  const setStepErrors = (n: number, found: Record<string, unknown>) => {
    if (n === 1) setErrors(found as BasicInfoErrors);
    else if (n === 2) setScheduleErrors(found as ScheduleLocationErrors);
    else if (n === 3) setRegistrationErrors(found as RegistrationErrors);
    else if (n === 4) setTicketsErrors(found as TicketsErrors);
    else if (n === 5) setDetailsErrors(found as EventDetailsErrors);
  };

  /**
   * Run validation before a save. Draft saves check only the current step
   * (lenient); Continue/Finish check every built step up to the current
   * one (strict) and steer the user to the first problem.
   */
  const applyValidation = (mode: "draft" | "continue"): boolean => {
    const builtSteps = Math.min(step, 5);

    if (mode === "draft") {
      const found = validateStep(step, "draft");
      if (Object.keys(found).length === 0) return true;
      setStepErrors(step, found);
      return false;
    }

    for (let n = 1; n <= builtSteps; n++) {
      const found = validateStep(n, "continue");
      if (Object.keys(found).length === 0) continue;
      setStepErrors(n, found);
      if (n !== step) {
        const first = found[Object.keys(found)[0]];
        toast.error(`Step ${n} needs attention: ${first}`);
        router.push(stepHref(n, eventId)); // take the user to the problem
      }
      return false;
    }
    return true;
  };

  /**
   * Persist the current form as a draft and upload any pending cover to
   * the "event-covers" bucket (owner-scoped path <user_id>/<event_id>/).
   * Returns the event id, or null when anything failed (toast shown).
   */
  const saveDraft = async (targetStep: number): Promise<string | null> => {
    const supabase = createClient();

    // Writes must be backed by the browser client's own live session —
    // RLS checks the JWT on the request, not the server-verified ownerId,
    // and Supabase answers 401 ("not logged in") when that token is
    // missing or expired. The gate renews it first so saves survive tabs
    // left open past the 1-hour token TTL.
    const sessionUserId = await ensureFreshSession(supabase);
    if (!sessionUserId) {
      toast.error("Your session expired — please sign in again");
      return null;
    }
    const userId = ownerId || sessionUserId;

    const id = eventId ?? crypto.randomUUID();

    // New cover picked → upload it (upsert replaces the previous file).
    let coverImageUrl = data.coverImageUrl;
    if (data.coverImage) {
      const extension = data.coverImage.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${id}/cover.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("event-covers")
        .upload(path, data.coverImage, { upsert: true });
      if (uploadError) {
        toast.error(`Cover upload failed: ${uploadError.message}`);
        return null;
      }
      coverImageUrl = supabase.storage.from("event-covers").getPublicUrl(path).data.publicUrl;
    }

    const fields = {
      current_step: targetStep,
      // Step 1 — Basic Information
      name: data.name.trim() || null,
      theme: data.theme.trim() || null,
      description: data.description.trim() || null,
      category: data.category || null,
      category_other: data.category === "other" ? data.categoryOther.trim() || null : null,
      event_type: data.eventType || null,
      cover_image_url: coverImageUrl,
      hashtags: data.hashtags,
      // Step 2 — Date, Time & Location
      start_date: schedule.startDate || null,
      end_date: schedule.endDate || null,
      start_time: schedule.startTime || null,
      end_time: schedule.endTime || null,
      timezone: schedule.timezone || null,
      venue_name: schedule.venueName.trim() || null,
      venue_address: schedule.venueAddress.trim() || null,
      venue_city: schedule.venueCity.trim() || null,
      venue_country: schedule.venueCountry || null,
      map_location: schedule.mapLocation.trim() || null,
      platform: schedule.platform || null,
      meeting_link: schedule.meetingLink.trim() || null,
      meeting_id: schedule.meetingId.trim() || null,
      // Empty outlet rows (no platform, no link) are dropped.
      streaming_outlets: schedule.outlets
        .filter((outlet) => outlet.platform || outlet.link.trim())
        .map((outlet) => ({ platform: outlet.platform, link: outlet.link.trim() })),
      // Step 3 — Registration (scheduled dates/caps only apply in context)
      registration_status: registration.status,
      registration_opens:
        registration.status === "scheduled" && registration.opensOn ? registration.opensOn : null,
      registration_closes:
        registration.status === "scheduled" && registration.closesOn ? registration.closesOn : null,
      capacity_type: registration.capacityType,
      max_attendees:
        registration.capacityType === "limited" && registration.maxAttendees.trim()
          ? Number(registration.maxAttendees)
          : null,
      approval_type: registration.approvalType,
      attendee_questions: registration.questions,
      // Step 5 — Event Details (public-page content)
      who_should_attend: details.whoShouldAttend.trim() || null,
      what_to_expect: details.whatToExpect.trim() || null,
      requirements: details.requirements.trim() || null,
      dress_code: details.dressCode.trim() || null,
      accessibility: details.accessibility,
      additional_info: details.additionalInfo.trim() || null,
      age_restriction: details.ageRestriction || "all_ages",
      age_restriction_custom:
        details.ageRestriction === "custom"
          ? details.ageRestrictionCustom.trim() || null
          : null,
    };

    // Insert on the first save (status starts as draft); update afterwards
    // so a future "published" event is never knocked back to draft.
    const persist = () =>
      eventId
        ? supabase.from("events").update(fields).eq("id", eventId)
        : supabase
            .from("events")
            .insert({ id, owner_id: userId, status: "draft", ...fields });

    let { error } = await persist();

    // PGRST301 / 401 — the JWT was rejected (e.g. it expired between the
    // session gate and this write). Refresh once and retry before
    // surfacing the failure.
    if (error && (error.code === "PGRST301" || error.code === "401")) {
      const { data } = await supabase.auth.refreshSession();
      if (data.session) ({ error } = await persist());
    }

    if (error) {
      toast.error(`Could not save your draft: ${error.message}`);
      return null;
    }

    // Step 4 — ticket types live in their own table: upsert the current
    // list (ids are stable client uuids), then remove rows the owner has
    // deleted. Skips cleanly when the list is empty.
    if (tickets.length > 0) {
      const ticketRows = tickets.map((ticket, index) => ({
        id: ticket.id,
        event_id: id,
        name: ticket.name.trim() || null,
        description: ticket.description.trim() || null,
        // "" and 0 both mean free — stored as 0 (payments-ready column).
        price: ticket.price.trim() === "" ? 0 : Number(ticket.price),
        currency: ticket.currency || DEFAULT_TICKET_CURRENCY,
        quantity: ticket.quantity.trim() === "" ? null : Number(ticket.quantity),
        sales_start: ticket.salesStart || null,
        sales_end: ticket.salesEnd || null,
        sort_order: index,
      }));
      const { error: ticketError } = await supabase
        .from("event_tickets")
        .upsert(ticketRows, { onConflict: "id" });
      if (ticketError) {
        toast.error(`Could not save tickets: ${ticketError.message}`);
        return null;
      }
    }

    const currentTicketIds = tickets.map((ticket) => ticket.id);
    let removeTickets = supabase.from("event_tickets").delete().eq("event_id", id);
    if (currentTicketIds.length > 0) {
      removeTickets = removeTickets.not("id", "in", `(${currentTicketIds.join(",")})`);
    }
    const { error: ticketRemoveError } = await removeTickets;
    if (ticketRemoveError) {
      toast.error(`Could not save tickets: ${ticketRemoveError.message}`);
      return null;
    }

    // The upload is safely stored — drop the pending file copy.
    if (data.coverImage) update({ coverImage: null, coverImageUrl });
    setEventId(id);
    return id;
  };

  /** Continue → strict validation, save, advance to the next step. */
  const handleContinue = async () => {
    if (busy) return;
    if (!applyValidation("continue")) return;
    setSavingIntent("continue");
    const id = await saveDraft(step + 1);
    setSavingIntent(null);
    if (!id) return;
    const next = step + 1;
    setMaxVisited((visited) => Math.max(visited, next));
    router.push(stepHref(next, id));
  };

  /** Save as draft — lenient validation, stays on the current step. */
  const handleSaveDraft = async () => {
    if (busy) return;
    if (!applyValidation("draft")) return;
    setSavingIntent("draft");
    const id = await saveDraft(step);
    setSavingIntent(null);
    if (id) toast.success("Draft saved — pick up right here any time");
  };

  /** Stepper jump — lenient-save first so no edits are lost mid-flight. */
  const handleStepSelect = async (target: number) => {
    if (busy || target === step) return;
    if (!applyValidation("draft")) return;
    setSavingIntent("jump");
    const id = await saveDraft(target);
    setSavingIntent(null);
    if (!id) return;
    setMaxVisited((visited) => Math.max(visited, target));
    router.push(stepHref(target, id));
  };

  /** Back is navigation only — earlier steps show the last saved data. */
  const handleBack = () => {
    if (busy || step <= 1) return;
    router.push(stepHref(step - 1, eventId));
  };

  /**
   * Publish (Step 6) — every built step must be complete; the save
   * persists the final draft, then a separate update flips status to
   * "published" (the save path never touches status, so a published
   * event can't be knocked back to draft). The event goes live on Tour.
   */
  const handlePublish = async () => {
    if (busy) return;
    if (!applyValidation("continue")) return;
    setSavingIntent("publish");
    const id = await saveDraft(step);
    if (id) {
      const supabase = createClient();
      const { error } = await supabase
        .from("events")
        .update({ status: "published" })
        .eq("id", id);
      if (error) {
        toast.error(`Could not publish: ${error.message}`);
      } else {
        toast.success(
          draft?.status === "published"
            ? "Event updated — changes are live on Tour"
            : "Event published — it's live on Tour"
        );
        router.push("/events");
      }
    }
    setSavingIntent(null);
  };

  const stepLabel = WIZARD_STEPS[step - 1].label;
  // Editing an event that was already published — saves update the live
  // event (status is never knocked back to draft), so the CTA reads Update.
  const wasPublished = draft?.status === "published";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      {/* Header — title, status badge, step counter */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Create event</h1>
        {eventId &&
          (wasPublished ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
              Published — edits go live on save
            </span>
          ) : (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-secondary-text dark:bg-zinc-800 dark:text-zinc-400">
              Draft
            </span>
          ))}
      </div>
      <p className="mt-1 text-sm text-secondary-text dark:text-zinc-400">
        Step {step} of {TOTAL_STEPS} — {stepLabel}
      </p>

      <div className="mt-6">
        <Stepper
          current={step}
          maxVisited={maxVisited}
          onSelect={handleStepSelect}
          disabled={busy}
        />
      </div>

      {/* Current step body */}
      <div className="mt-8">
        {step === 1 ? (
          <BasicInfoStep data={data} errors={errors} onChange={update} />
        ) : step === 2 ? (
          <DateTimeLocationStep
            data={schedule}
            eventType={data.eventType}
            errors={scheduleErrors}
            onChange={updateSchedule}
          />
        ) : step === 3 ? (
          <RegistrationStep data={registration} errors={registrationErrors} onChange={updateRegistration} />
        ) : step === 4 ? (
          <TicketsStep tickets={tickets} errors={ticketsErrors} onChange={updateTickets} />
        ) : step === 5 ? (
          <EventDetailsStep data={details} errors={detailsErrors} onChange={updateDetails} />
        ) : (
          <ReviewStep
            data={data}
            schedule={schedule}
            registration={registration}
            tickets={tickets}
            details={details}
            onEdit={(target) => router.push(stepHref(target, eventId))}
          />
        )}
      </div>

      {/* Footer nav — Back / Save as draft on the left, Continue or Finish right */}
      <div className="mt-10 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-700">
        <div className="flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={busy}
              className={SECONDARY_BUTTON_CLASSES}
            >
              <span aria-hidden="true">←</span> Back
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={busy}
            className={SECONDARY_BUTTON_CLASSES}
          >
            {savingIntent === "draft" && <Spinner size="sm" />}
            {savingIntent === "draft" ? "Saving…" : "Save as draft"}
          </button>
        </div>
        {step === TOTAL_STEPS ? (
          <button
            type="button"
            onClick={handlePublish}
            disabled={busy}
            className={PRIMARY_BUTTON_CLASSES}
          >
            {savingIntent === "publish" && <Spinner size="sm" className="text-white" />}
            {wasPublished
              ? savingIntent === "publish"
                ? "Updating…"
                : "Update event"
              : savingIntent === "publish"
                ? "Publishing…"
                : "Publish"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleContinue}
            disabled={busy}
            className={PRIMARY_BUTTON_CLASSES}
          >
            {savingIntent === "continue" && <Spinner size="sm" className="text-white" />}
            Continue <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </div>
  );
}
