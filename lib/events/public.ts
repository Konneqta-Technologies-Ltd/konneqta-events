/* ── Public event page (/e/[id]) — view row types + mappers ───────────────
 *
 * The published_events_public view (supabase/schema.sql, section 18) is the
 * single source for the public detail page: only published events, a safe
 * column set, plus the organizer's display name/avatar (profiles are
 * RLS-private so the page itself can't join for them). meeting_link and
 * meeting_id are deliberately absent — they're surfaced server-side only
 * to attendees with an approved registration.
 */

import { EVENT_CATEGORIES, EVENT_TYPES, OTHER_CATEGORY } from "./constants";
import type { AttendeeQuestion, EventRow, StreamingOutlet } from "./types";
import { parseOutlets, parseQuestions } from "./types";

/** Row shape of the published_events_public view as Supabase returns it. */
export type PublicEventRow = {
  id: string;
  name: string | null;
  theme: string | null;
  description: string | null;
  category: string | null;
  category_other: string | null;
  event_type: string | null;
  cover_image_url: string | null;
  hashtags: string[] | null;
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
  streaming_outlets: unknown; // jsonb array of { platform, link }
  registration_status: string | null;
  registration_opens: string | null;
  registration_closes: string | null;
  capacity_type: string | null;
  max_attendees: number | null;
  approval_type: string | null;
  attendee_questions: unknown; // jsonb array of AttendeeQuestion
  who_should_attend: string | null;
  what_to_expect: string | null;
  requirements: string | null;
  dress_code: string | null;
  accessibility: string[] | null;
  additional_info: string | null;
  age_restriction: string | null;
  age_restriction_custom: string | null;
  cancelled_at: string | null;
  updated_at: string;
  organizer_name: string | null;
  organizer_avatar: string | null;
};

/** camelCase shape the /e/[id] page renders. */
export type PublicEventDetail = {
  id: string;
  name: string;
  theme: string | null;
  description: string | null;
  category: string | null;
  categoryOther: string | null;
  eventType: string | null;
  coverImageUrl: string | null;
  hashtags: string[];
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  timezone: string | null;
  venueName: string | null;
  venueAddress: string | null;
  venueCity: string | null;
  venueCountry: string | null;
  mapLocation: string | null;
  platform: string | null;
  outlets: StreamingOutlet[];
  registrationStatus: string;
  registrationOpens: string | null;
  registrationCloses: string | null;
  capacityType: string;
  maxAttendees: number | null;
  approvalType: string;
  questions: AttendeeQuestion[];
  whoShouldAttend: string | null;
  whatToExpect: string | null;
  requirements: string | null;
  dressCode: string | null;
  accessibility: string[];
  additionalInfo: string | null;
  ageRestriction: string | null;
  ageRestrictionCustom: string | null;
  cancelledAt: string | null;
  organizerName: string | null;
  organizerAvatar: string | null;
};

/** One ticket on the public page — the selector and price labels. */
export type PublicTicket = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
};

/** Column subset the public page selects from public.event_tickets. */
export type PublicTicketRow = {
  id: string;
  name: string | null;
  description: string | null;
  price: string | null; // numeric arrives as a string ("0.00")
  currency: string | null;
};

export function publicTicketsFromRows(rows: PublicTicketRow[]): PublicTicket[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name?.trim() || "Ticket",
    description: row.description,
    price: row.price != null ? Number(row.price) : null,
    currency: row.currency || "NGN",
  }));
}

/** Human label for a ticket price — "Free" or "NGN 2,500". */
export function ticketPriceLabel(ticket: PublicTicket): string {
  if (ticket.price == null || ticket.price === 0) return "Free";
  return `${ticket.currency} ${ticket.price.toLocaleString("en-US")}`;
}

/** Category label — the custom text when the organizer chose "Other". */
export function categoryLabel(
  detail: Pick<PublicEventDetail, "category" | "categoryOther">
): string | null {
  if (!detail.category) return null;
  if (detail.category === OTHER_CATEGORY) {
    return detail.categoryOther?.trim() || "Other";
  }
  return EVENT_CATEGORIES.find((option) => option.value === detail.category)?.label ?? null;
}

/** Event type label — "In Person" / "Online" / "Hybrid". */
export function eventTypeLabel(detail: Pick<PublicEventDetail, "eventType">): string | null {
  if (!detail.eventType) return null;
  return EVENT_TYPES.find((option) => option.value === detail.eventType)?.label ?? null;
}

/** Map a published_events_public view row onto the page shape. */
export function publicDetailFromRow(row: PublicEventRow): PublicEventDetail {
  return {
    id: row.id,
    name: row.name?.trim() || "Untitled event",
    theme: row.theme,
    description: row.description,
    category: row.category,
    categoryOther: row.category_other,
    eventType: row.event_type,
    coverImageUrl: row.cover_image_url,
    hashtags: row.hashtags ?? [],
    startDate: row.start_date,
    endDate: row.end_date,
    // Postgres returns HH:mm:ss — labels want the short form.
    startTime: (row.start_time ?? "").slice(0, 5),
    endTime: (row.end_time ?? "").slice(0, 5),
    timezone: row.timezone,
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    venueCity: row.venue_city,
    venueCountry: row.venue_country,
    mapLocation: row.map_location,
    platform: row.platform,
    outlets: parseOutlets(row.streaming_outlets),
    registrationStatus: row.registration_status ?? "open",
    registrationOpens: row.registration_opens,
    registrationCloses: row.registration_closes,
    capacityType: row.capacity_type ?? "unlimited",
    maxAttendees: row.max_attendees,
    approvalType: row.approval_type ?? "automatic",
    questions: parseQuestions(row.attendee_questions),
    whoShouldAttend: row.who_should_attend,
    whatToExpect: row.what_to_expect,
    requirements: row.requirements,
    dressCode: row.dress_code,
    accessibility: row.accessibility ?? [],
    additionalInfo: row.additional_info,
    ageRestriction: row.age_restriction,
    ageRestrictionCustom: row.age_restriction_custom,
    cancelledAt: row.cancelled_at,
    organizerName: row.organizer_name,
    organizerAvatar: row.organizer_avatar,
  };
}

/**
 * Draft preview — map a full public.events row (readable only by its owner
 * via RLS) onto the same page shape so an unpublished event can be previewed
 * with a banner instead of a 404. The caller guarantees ownership.
 */
export function publicDetailFromEventRow(
  row: EventRow,
  organizerName: string | null,
  organizerAvatar: string | null
): PublicEventDetail {
  return publicDetailFromRow({
    ...row,
    organizer_name: organizerName,
    organizer_avatar: organizerAvatar,
  });
}

