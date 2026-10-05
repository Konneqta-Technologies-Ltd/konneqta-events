import { describe, expect, it } from "vitest";

import {
  categoryLabel,
  eventTypeLabel,
  publicDetailFromRow,
  publicTicketsFromRows,
  ticketPriceLabel,
  type PublicEventRow,
} from "./public";

/** Minimal view row for mapper tests. */
const viewRow: PublicEventRow = {
  id: "e1",
  name: "  Tech Connect  ",
  theme: "A meetup",
  description: null,
  category: "other",
  category_other: "Community hangout",
  event_type: "online",
  cover_image_url: null,
  hashtags: null,
  start_date: "2026-10-01",
  end_date: null,
  start_time: "18:30:00",
  end_time: null,
  timezone: "Africa/Lagos",
  venue_name: null,
  venue_address: null,
  venue_city: null,
  venue_country: null,
  map_location: null,
  platform: "zoom",
  streaming_outlets: [{ platform: "twitch", link: "https://t.tv/s" }],
  registration_status: null,
  registration_opens: null,
  registration_closes: null,
  capacity_type: null,
  max_attendees: null,
  approval_type: null,
  attendee_questions: null,
  who_should_attend: null,
  what_to_expect: null,
  requirements: null,
  dress_code: null,
  accessibility: null,
  additional_info: null,
  age_restriction: null,
  age_restriction_custom: null,
  cancelled_at: null,
  updated_at: "2026-09-02T00:00:00Z",
  organizer_name: "Ada Obi",
  organizer_avatar: null,
};

describe("publicDetailFromRow", () => {
  it("maps the view row and applies registration defaults", () => {
    const detail = publicDetailFromRow(viewRow);
    expect(detail.name).toBe("Tech Connect");
    expect(detail.startTime).toBe("18:30");
    expect(detail.registrationStatus).toBe("open");
    expect(detail.capacityType).toBe("unlimited");
    expect(detail.approvalType).toBe("automatic");
    expect(detail.hashtags).toEqual([]);
    expect(detail.outlets).toEqual([{ platform: "twitch", link: "https://t.tv/s" }]);
  });

  it("falls back to a readable name for untitled events", () => {
    const detail = publicDetailFromRow({ ...viewRow, name: "   " });
    expect(detail.name).toBe("Untitled event");
  });
});

describe("categoryLabel", () => {
  it("uses the custom text for the Other category", () => {
    expect(categoryLabel({ category: "other", categoryOther: "Community hangout" })).toBe(
      "Community hangout"
    );
  });

  it("falls back to Other when the custom text is empty", () => {
    expect(categoryLabel({ category: "other", categoryOther: null })).toBe("Other");
  });

  it("resolves known categories to their labels", () => {
    expect(categoryLabel({ category: "hackathon", categoryOther: null })).toBe("Hackathon");
    expect(categoryLabel({ category: null, categoryOther: null })).toBeNull();
  });
});

describe("eventTypeLabel", () => {
  it("resolves each event type", () => {
    expect(eventTypeLabel({ eventType: "in_person" })).toBe("In Person");
    expect(eventTypeLabel({ eventType: "online" })).toBe("Online");
    expect(eventTypeLabel({ eventType: null })).toBeNull();
  });
});

describe("publicTicketsFromRows + ticketPriceLabel", () => {
  it("maps numeric price strings and defaults the currency", () => {
    const tickets = publicTicketsFromRows([
      { id: "t1", name: null, description: null, price: "2500.00", currency: null },
    ]);
    expect(tickets[0]).toMatchObject({ name: "Ticket", price: 2500, currency: "NGN" });
  });

  it("labels zero and null prices as Free", () => {
    expect(ticketPriceLabel({ id: "t", name: "T", description: null, price: 0, currency: "NGN" })).toBe("Free");
    expect(ticketPriceLabel({ id: "t", name: "T", description: null, price: null, currency: "NGN" })).toBe("Free");
  });

  it("formats paid prices with the currency", () => {
    expect(
      ticketPriceLabel({ id: "t", name: "T", description: null, price: 2500, currency: "NGN" })
    ).toBe("NGN 2,500");
  });
});
