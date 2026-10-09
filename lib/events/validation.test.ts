import { describe, expect, it } from "vitest";

import { FIELD_LIMITS, HASHTAG_LIMITS } from "./constants";
import {
  validateBasicInfo,
  validateEventDetails,
  validateRegistration,
  validateScheduleLocation,
  validateTickets,
} from "./validation";
import {
  emptyBasicInfo,
  emptyEventDetails,
  emptyRegistration,
  emptyScheduleLocation,
  emptyTicket,
  type BasicInfoData,
} from "./types";

const basicInfo = (patch: Partial<BasicInfoData> = {}): BasicInfoData => ({
  ...emptyBasicInfo(),
  ...patch,
});

describe("validateBasicInfo", () => {
  it("requires a name in continue mode", () => {
    const errors = validateBasicInfo(basicInfo(), "continue");
    expect(errors.name).toBe("Event name is required");
  });

  it("allows a missing name in draft mode", () => {
    const errors = validateBasicInfo(basicInfo(), "draft");
    expect(errors.name).toBeUndefined();
  });

  it("enforces the minimum name length", () => {
    const errors = validateBasicInfo(basicInfo({ name: "A" }), "continue");
    expect(errors.name).toMatch(/at least 2 characters/i);
  });

  it("enforces the maximum name length", () => {
    const errors = validateBasicInfo(basicInfo({ name: "x".repeat(FIELD_LIMITS.nameMax + 1) }), "draft");
    expect(errors.name).toMatch(/fewer/i);
  });

  it("requires custom text when the category is Other (continue)", () => {
    const errors = validateBasicInfo(basicInfo({ name: "Ok name", category: "other" }), "continue");
    expect(errors.categoryOther).toBeDefined();
  });

  it("rejects unknown categories", () => {
    const errors = validateBasicInfo(basicInfo({ name: "Ok name", category: "nope" }), "draft");
    expect(errors.category).toBeDefined();
  });

  it("caps the hashtag list", () => {
    const errors = validateBasicInfo(
      basicInfo({ name: "Ok name", hashtags: Array.from({ length: HASHTAG_LIMITS.maxTags + 1 }, (_, i) => `tag${i}`) }),
      "draft"
    );
    expect(errors.hashtags).toMatch(/up to \d+ hashtags/i);
  });

  it("passes a fully valid form", () => {
    const errors = validateBasicInfo(
      basicInfo({ name: "Konneqta Meetup", category: "meetup", eventType: "in_person" }),
      "continue"
    );
    expect(errors).toEqual({});
  });
});

describe("validateScheduleLocation", () => {
  it("requires venue fields for in-person events in continue mode", () => {
    const errors = validateScheduleLocation(emptyScheduleLocation(), "in_person", "continue");
    expect(errors.venueName).toBeDefined();
    expect(errors.venueCity).toBeDefined();
  });

  it("requires an online platform for online events in continue mode", () => {
    const errors = validateScheduleLocation(emptyScheduleLocation(), "online", "continue");
    expect(errors.platform).toBeDefined();
    expect(errors.meetingLink).toBeDefined();
  });

  it("accepts an empty schedule in draft mode", () => {
    const errors = validateScheduleLocation(emptyScheduleLocation(), "in_person", "draft");
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("rejects a malformed meeting link", () => {
    const errors = validateScheduleLocation(
      { ...emptyScheduleLocation(), platform: "zoom", meetingLink: "not-a-url" },
      "online",
      "continue"
    );
    expect(errors.meetingLink).toMatch(/http/i);
  });

  it("flags an end date before the start date", () => {
    const errors = validateScheduleLocation(
      { ...emptyScheduleLocation(), startDate: "2026-09-20", endDate: "2026-09-18" },
      "in_person",
      "draft"
    );
    expect(errors.endDate).toBeDefined();
  });
});

describe("validateRegistration", () => {
  it("requires max attendees for limited capacity in continue mode", () => {
    const errors = validateRegistration(
      { ...emptyRegistration(), capacityType: "limited" },
      "continue"
    );
    expect(errors.maxAttendees).toBe("Maximum attendees is required");
  });

  it("lets limited capacity pass in draft mode until it is strict", () => {
    const errors = validateRegistration(
      { ...emptyRegistration(), capacityType: "limited" },
      "draft"
    );
    expect(errors.maxAttendees).toBeUndefined();
  });

  it("rejects non-integer or zero attendee caps", () => {
    expect(
      validateRegistration({ ...emptyRegistration(), capacityType: "limited", maxAttendees: "2.5" }, "continue")
        .maxAttendees
    ).toMatch(/whole number/i);
    expect(
      validateRegistration({ ...emptyRegistration(), capacityType: "limited", maxAttendees: "0" }, "continue")
        .maxAttendees
    ).toMatch(/whole number/i);
  });

  it("requires an open date for scheduled registration in continue mode", () => {
    const errors = validateRegistration(
      { ...emptyRegistration(), status: "scheduled" },
      "continue"
    );
    expect(errors.opensOn).toBe("Registration open date is required");
  });

  it("rejects a close date before the open date", () => {
    const errors = validateRegistration(
      {
        ...emptyRegistration(),
        status: "scheduled",
        opensOn: "2026-09-20",
        closesOn: "2026-09-18",
      },
      "continue"
    );
    expect(errors.closesOn).toMatch(/before the open date/i);
  });

  it("requires two options on choice questions in continue mode", () => {
    const errors = validateRegistration(
      {
        ...emptyRegistration(),
        questions: [
          {
            id: "q1",
            label: "Dietary needs?",
            answerType: "dropdown",
            required: false,
            options: ["Vegetarian"],
          },
        ],
      },
      "continue"
    );
    expect(errors.questions).toMatch(/at least 2 options/i);
  });
});

describe("validateTickets", () => {
  it("requires at least one ticket in continue mode", () => {
    const errors = validateTickets([], "continue");
    expect(errors.tickets).toMatch(/at least one ticket/i);
  });

  it("allows an empty list in draft mode", () => {
    const errors = validateTickets([], "draft");
    expect(errors.tickets).toBeUndefined();
  });

  it("flags duplicate ticket names in continue mode", () => {
    const tickets = [
      emptyTicket("Early bird"),
      { ...emptyTicket(), name: "early bird", price: "0", quantity: "10" },
    ];
    const errors = validateTickets(tickets, "continue");
    const second = tickets[1]!;
    expect(errors.items?.[second.id]?.name).toMatch(/unique/i);
  });

  it("rejects malformed prices", () => {
    const ticket = emptyTicket("Regular");
    ticket.price = "12,34";
    const errors = validateTickets([ticket], "continue");
    expect(errors.items?.[ticket.id]?.price).toBeDefined();
  });
});

describe("validateEventDetails", () => {
  it("accepts the blank form", () => {
    expect(validateEventDetails(emptyEventDetails(), "continue")).toEqual({});
  });

  it("requires custom age text when Custom is chosen", () => {
    const errors = validateEventDetails(
      { ...emptyEventDetails(), ageRestriction: "custom" },
      "continue"
    );
    expect(errors.ageRestrictionCustom).toBeDefined();
  });

  it("rejects unknown accessibility values", () => {
    const errors = validateEventDetails(
      { ...emptyEventDetails(), accessibility: ["teleporter"] },
      "draft"
    );
    expect(errors.accessibility).toBeDefined();
  });

  it("caps free-text fields", () => {
    const errors = validateEventDetails(
      { ...emptyEventDetails(), dressCode: "x".repeat(61) },
      "draft"
    );
    expect(errors.dressCode).toBeDefined();
  });
});
