import { describe, expect, it } from "vitest";

import { draftFromRow, parseOutlets, parseQuestions, type EventRow } from "./types";

/** Minimal but complete events row for mapper tests. */
const row: EventRow = {
  id: "e1",
  owner_id: "u1",
  status: "published",
  current_step: 4,
  name: "  Tech Connect  ",
  theme: "A meetup",
  description: null,
  category: "meetup",
  category_other: null,
  event_type: "hybrid",
  cover_image_url: null,
  hashtags: ["tech", "lagos"],
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-02T00:00:00Z",
  cancelled_at: null,
  start_date: "2026-10-01",
  end_date: null,
  start_time: "18:00:00",
  end_time: null,
  timezone: "Africa/Lagos",
  venue_name: null,
  venue_address: null,
  venue_city: "Lagos",
  venue_country: "Nigeria",
  map_location: null,
  platform: "zoom",
  meeting_link: null,
  meeting_id: null,
  streaming_outlets: [
    { platform: "youtube_live", link: "https://youtu.be/x" },
    { platform: "", link: "" },
    "garbage",
  ],
  registration_status: "scheduled",
  registration_opens: "2026-09-10",
  registration_closes: null,
  capacity_type: "limited",
  max_attendees: 50,
  approval_type: "manual",
  attendee_questions: [
    { id: "q1", label: "Company?", answerType: "short_answer", required: false, options: [] },
    { label: "Broken", answerType: 5, required: "yes", options: null },
  ],
  who_should_attend: null,
  what_to_expect: null,
  requirements: null,
  dress_code: null,
  accessibility: null,
  additional_info: null,
  age_restriction: null,
  age_restriction_custom: null,
};

describe("draftFromRow", () => {
  it("maps snake_case columns onto the wizard draft", () => {
    const draft = draftFromRow(row, []);
    expect(draft.id).toBe("e1");
    expect(draft.basicInfo.name).toBe("  Tech Connect  ");
    expect(draft.basicInfo.hashtags).toEqual(["tech", "lagos"]);
    expect(draft.schedule.startTime).toBe("18:00"); // HH:mm:ss trimmed
    expect(draft.registration.capacityType).toBe("limited");
    expect(draft.registration.maxAttendees).toBe("50");
    expect(draft.registration.approvalType).toBe("manual");
  });

  it("applies safe defaults for nullable columns", () => {
    const draft = draftFromRow(row, []);
    expect(draft.details.ageRestriction).toBe("all_ages"); // null → default
    expect(draft.registration.status).toBe("scheduled"); // stored value kept
    expect(draft.schedule.outlets).toHaveLength(2); // garbage entry dropped
  });
});

describe("parseOutlets", () => {
  it("drops non-object entries and keeps valid ones", () => {
    const outlets = parseOutlets([null, "x", { platform: "twitch", link: "https://t.tv/s" }]);
    expect(outlets).toEqual([{ platform: "twitch", link: "https://t.tv/s" }]);
  });

  it("returns an empty list for non-array jsonb", () => {
    expect(parseOutlets(null)).toEqual([]);
    expect(parseOutlets({})).toEqual([]);
    expect(parseOutlets("nope")).toEqual([]);
  });
});

describe("parseQuestions", () => {
  it("repairs malformed entries with safe defaults", () => {
    const questions = parseQuestions(row.attendee_questions);
    expect(questions).toHaveLength(2);
    expect(questions[0]).toEqual({
      id: "q1",
      label: "Company?",
      answerType: "short_answer",
      required: false,
      options: [],
    });
    const repaired = questions[1]!;
    expect(typeof repaired.id).toBe("string");
    expect(repaired.answerType).toBe("short_answer");
    expect(repaired.required).toBe(false);
    expect(repaired.options).toEqual([]);
  });

  it("returns an empty list for non-array jsonb", () => {
    expect(parseQuestions(undefined)).toEqual([]);
  });
});
