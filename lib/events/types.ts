/* ── Create-event wizard — shared types + row mappers ──────────────────── */

import { DEFAULT_TICKET_CURRENCY } from "./constants";

/** Row shape of public.events as Supabase returns it (snake_case). */
export type EventRow = {
  id: string;
  owner_id: string;
  status: "draft" | "published";
  current_step: number;
  name: string | null;
  theme: string | null;
  description: string | null;
  category: string | null;
  category_other: string | null;
  event_type: string | null;
  cover_image_url: string | null;
  hashtags: string[] | null;
  // Timestamps (Supabase defaults / the set_updated_at trigger).
  created_at: string;
  updated_at: string;
  // Null when live; set when the organizer cancels a published event.
  cancelled_at: string | null;
  // Step 2 — Date, Time & Location
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  timezone: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_city: string | null;
  venue_country: string | null;
  map_location: string | null;
  platform: string | null;
  meeting_link: string | null;
  meeting_id: string | null;
  streaming_outlets: unknown; // jsonb array of { platform, link }
  // Step 3 — Registration
  registration_status: string | null;
  registration_opens: string | null;
  registration_closes: string | null;
  capacity_type: string | null;
  max_attendees: number | null;
  approval_type: string | null;
  attendee_questions: unknown; // jsonb array of AttendeeQuestion
  // Step 5 — Event Details (public-page content)
  who_should_attend: string | null;
  what_to_expect: string | null;
  requirements: string | null;
  dress_code: string | null;
  accessibility: string[] | null;
  additional_info: string | null;
  age_restriction: string | null;
  age_restriction_custom: string | null;
};

/** Column subset the My Events dashboard list selects from public.events. */
export type EventListItem = Pick<
  EventRow,
  | "id"
  | "status"
  | "current_step"
  | "name"
  | "theme"
  | "category"
  | "event_type"
  | "cover_image_url"
  | "start_date"
  | "end_date"
  | "venue_city"
  | "venue_country"
  | "cancelled_at"
  | "updated_at"
>;

/** Wizard-facing draft — camelCase, with Steps 1–3 state folded in. */
export type EventDraft = {
  id: string;
  status: "draft" | "published";
  /** Highest step the owner has reached in the flow. */
  currentStep: number;
  basicInfo: BasicInfoData;
  schedule: ScheduleLocationData;
  registration: RegistrationData;
  /** Step 4 — ticket types (own table, synced on every save). */
  tickets: TicketData[];
  /** Step 5 — Event Details (public-page content columns on events). */
  details: EventDetailsData;
};

/**
 * Step 1 "Basic Information" form state. coverImage is the client-only
 * pending upload (never persisted as a File); coverImageUrl is what a
 * previous save already pushed to the event-covers bucket.
 */
export type BasicInfoData = {
  name: string;
  theme: string;
  description: string;
  category: string; // "" until chosen — an EVENT_CATEGORIES value
  categoryOther: string; // filled when category === "other"
  eventType: string; // "" until chosen — an EVENT_TYPES value
  coverImage: File | null;
  coverImageUrl: string | null;
  hashtags: string[];
};

export type BasicInfoErrors = Partial<Record<keyof BasicInfoData, string>>;

/** One extra streaming outlet row (Step 2, online/hybrid events). */
export type StreamingOutlet = {
  platform: string; // a MEETING_PLATFORMS value ("" until chosen)
  link: string; // optional broadcast URL
};

/**
 * Step 2 "Date, Time & Location" form state. Dates are yyyy-mm-dd and
 * times HH:mm, exactly what the native date/time inputs round-trip.
 * Which of the venue/online fields matter depends on Step 1's event type.
 */
export type ScheduleLocationData = {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timezone: string; // IANA zone name, e.g. Africa/Lagos
  venueName: string;
  venueAddress: string;
  venueCity: string;
  venueCountry: string;
  mapLocation: string; // pasted Google Maps link or Plus Code
  platform: string;
  meetingLink: string;
  meetingId: string;
  outlets: StreamingOutlet[];
};

export type ScheduleLocationErrors = Partial<Record<keyof ScheduleLocationData, string>>;

/** One custom attendee question (Step 3). */
export type AttendeeQuestion = {
  id: string;
  label: string;
  answerType: string; // an ANSWER_TYPES value
  required: boolean;
  options: string[]; // choice types only (dropdown / multiple_choice / checkbox)
};

/**
 * Step 3 "Registration" form state. maxAttendees stays a string (input
 * round-trip) and is validated/parsed on save.
 */
export type RegistrationData = {
  status: string; // "open" | "scheduled" | "closed"
  opensOn: string; // yyyy-mm-dd — scheduled only
  closesOn: string; // yyyy-mm-dd — scheduled only, optional
  capacityType: string; // "unlimited" | "limited"
  maxAttendees: string;
  approvalType: string; // "automatic" | "manual"
  questions: AttendeeQuestion[];
};

export type RegistrationErrors = Partial<Record<keyof RegistrationData, string>>;

/** Row shape of public.event_tickets as Supabase returns it. */
export type TicketRow = {
  id: string;
  event_id: string;
  name: string | null;
  description: string | null;
  price: string | null; // numeric(10,2) arrives as a string ("0.00")
  currency: string;
  quantity: number | null;
  sales_start: string | null;
  sales_end: string | null;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/**
 * Step 4 "Tickets" form state — one ticket type per card. price and
 * quantity stay strings (input round-trip, like maxAttendees) and are
 * validated/parsed on save; ""/0 both mean free.
 */
export type TicketData = {
  /** Stable client uuid — upserts and removal tracking across saves. */
  id: string;
  name: string;
  price: string;
  /** A TICKET_CURRENCIES value (default NGN). */
  currency: string;
  quantity: string;
  description: string;
  // Optional sales window (yyyy-mm-dd) — an early bird is a cheaper
  // ticket whose window closes earlier.
  salesStart: string;
  salesEnd: string;
};

/** Field-level errors for one ticket card. */
export type TicketFieldErrors = Partial<
  Record<"name" | "price" | "quantity" | "salesStart" | "salesEnd" | "description", string>
>;

/** Step 4 errors — list-level issues plus per-card field errors. */
export type TicketsErrors = {
  tickets?: string;
  items?: Record<string, TicketFieldErrors>;
};

/** Blank ticket card — defaults to a free ticket in the default currency. */
export function emptyTicket(name = ""): TicketData {
  return {
    id: crypto.randomUUID(),
    name,
    price: "",
    currency: DEFAULT_TICKET_CURRENCY,
    quantity: "",
    description: "",
    salesStart: "",
    salesEnd: "",
  };
}

/**
 * Step 5 "Event Details" form state — the content that makes the public
 * event page richer. Everything is optional apart from the custom note
 * that "Custom" in the age requirement asks for.
 */
export type EventDetailsData = {
  whoShouldAttend: string;
  whatToExpect: string;
  requirements: string;
  dressCode: string;
  /** Chosen ACCESSIBILITY_OPTIONS values. */
  accessibility: string[];
  additionalInfo: string;
  /** An AGE_RESTRICTION_OPTIONS value (defaults to all_ages). */
  ageRestriction: string;
  /** Free-text age note used when ageRestriction === "custom". */
  ageRestrictionCustom: string;
};

export type EventDetailsErrors = Partial<Record<keyof EventDetailsData, string>>;

/** Blank Step 5 form — All ages preselected, everything else empty. */
export function emptyEventDetails(): EventDetailsData {
  return {
    whoShouldAttend: "",
    whatToExpect: "",
    requirements: "",
    dressCode: "",
    accessibility: [],
    additionalInfo: "",
    ageRestriction: "all_ages",
    ageRestrictionCustom: "",
  };
}

/** Blank Step 3 form — the MVP defaults (open, unlimited, automatic). */
export function emptyRegistration(): RegistrationData {
  return {
    status: "open",
    opensOn: "",
    closesOn: "",
    capacityType: "unlimited",
    maxAttendees: "",
    approvalType: "automatic",
    questions: [],
  };
}

/** Blank Step 2 form. */
export function emptyScheduleLocation(): ScheduleLocationData {
  return {
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    timezone: "",
    venueName: "",
    venueAddress: "",
    venueCity: "",
    venueCountry: "",
    mapLocation: "",
    platform: "",
    meetingLink: "",
    meetingId: "",
    outlets: [],
  };
}

/** Blank form — the starting point when no draft is being resumed. */
export function emptyBasicInfo(): BasicInfoData {
  return {
    name: "",
    theme: "",
    description: "",
    category: "",
    categoryOther: "",
    eventType: "",
    coverImage: null,
    coverImageUrl: null,
    hashtags: [],
  };
}

/** Map a public.events row onto the full wizard draft. */
export function draftFromRow(row: EventRow, ticketRows: TicketRow[] = []): EventDraft {
  return {
    id: row.id,
    status: row.status,
    currentStep: row.current_step,
    basicInfo: {
      name: row.name ?? "",
      theme: row.theme ?? "",
      description: row.description ?? "",
      category: row.category ?? "",
      categoryOther: row.category_other ?? "",
      eventType: row.event_type ?? "",
      coverImage: null,
      coverImageUrl: row.cover_image_url ?? null,
      hashtags: row.hashtags ?? [],
    },
    schedule: {
      startDate: row.start_date ?? "",
      endDate: row.end_date ?? "",
      // Postgres returns HH:mm:ss — the time inputs want HH:mm.
      startTime: (row.start_time ?? "").slice(0, 5),
      endTime: (row.end_time ?? "").slice(0, 5),
      timezone: row.timezone ?? "",
      venueName: row.venue_name ?? "",
      venueAddress: row.venue_address ?? "",
      venueCity: row.venue_city ?? "",
      venueCountry: row.venue_country ?? "",
      mapLocation: row.map_location ?? "",
      platform: row.platform ?? "",
      meetingLink: row.meeting_link ?? "",
      meetingId: row.meeting_id ?? "",
      outlets: parseOutlets(row.streaming_outlets),
    },
    registration: {
      status: row.registration_status ?? "open",
      opensOn: row.registration_opens ?? "",
      closesOn: row.registration_closes ?? "",
      capacityType: row.capacity_type ?? "unlimited",
      maxAttendees: row.max_attendees != null ? String(row.max_attendees) : "",
      approvalType: row.approval_type ?? "automatic",
      questions: parseQuestions(row.attendee_questions),
    },
    tickets: ticketsFromRows(ticketRows),
    details: {
      whoShouldAttend: row.who_should_attend ?? "",
      whatToExpect: row.what_to_expect ?? "",
      requirements: row.requirements ?? "",
      dressCode: row.dress_code ?? "",
      accessibility: row.accessibility ?? [],
      additionalInfo: row.additional_info ?? "",
      ageRestriction: row.age_restriction ?? "all_ages",
      ageRestrictionCustom: row.age_restriction_custom ?? "",
    },
  };
}

/** Map public.event_tickets rows (ordered by sort_order) onto form state. */
function ticketsFromRows(rows: TicketRow[]): TicketData[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name ?? "",
    // numeric arrives as "0.00" — trim to what the price input expects.
    price: row.price != null ? String(Number(row.price)) : "",
    currency: row.currency || DEFAULT_TICKET_CURRENCY,
    quantity: row.quantity != null ? String(row.quantity) : "",
    description: row.description ?? "",
    salesStart: row.sales_start ?? "",
    salesEnd: row.sales_end ?? "",
  }));
}

/** Safely coerce the jsonb streaming_outlets column into outlet rows. */
export function parseOutlets(value: unknown): StreamingOutlet[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    return [
      {
        platform: typeof record.platform === "string" ? record.platform : "",
        link: typeof record.link === "string" ? record.link : "",
      },
    ];
  });
}

/** Safely coerce the jsonb attendee_questions column into question rows. */
export function parseQuestions(value: unknown): AttendeeQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    return [
      {
        id: typeof record.id === "string" ? record.id : crypto.randomUUID(),
        label: typeof record.label === "string" ? record.label : "",
        answerType: typeof record.answerType === "string" ? record.answerType : "short_answer",
        required: record.required === true,
        options: Array.isArray(record.options)
          ? record.options.filter((option): option is string => typeof option === "string")
          : [],
      },
    ];
  });
}
