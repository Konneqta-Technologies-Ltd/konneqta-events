import { describe, expect, it } from "vitest";

import type { PublicTicket } from "./public";
import {
  buildAnswersPayload,
  emptyRegistrationForm,
  registrationErrorMessage,
  validateRegistrationForm,
  type RegistrationFormState,
} from "./registration";
import type { AttendeeQuestion } from "./types";

const tickets: PublicTicket[] = [
  { id: "t1", name: "Regular", description: null, price: 0, currency: "NGN" },
  { id: "t2", name: "VIP", description: null, price: 2500, currency: "NGN" },
];

const questions: AttendeeQuestion[] = [
  { id: "q1", label: "Company?", answerType: "short_answer", required: true, options: [] },
  { id: "q2", label: "T-shirt size", answerType: "dropdown", required: false, options: ["S", "M", "L"] },
  { id: "q3", label: "Extras", answerType: "checkbox", required: false, options: ["Lunch", "Workshop"] },
  { id: "q4", label: "Years of experience", answerType: "number", required: false, options: [] },
];

const validState = (patch: Partial<RegistrationFormState> = {}): RegistrationFormState => ({
  firstName: "Ada",
  lastName: "Obi",
  email: "ada@example.com",
  ticketId: "t1",
  answers: { q1: "Konneqta" },
  ...patch,
});

describe("validateRegistrationForm", () => {
  it("passes a complete form", () => {
    expect(validateRegistrationForm(validState(), questions, tickets)).toEqual({});
  });

  it("requires identity fields", () => {
    const errors = validateRegistrationForm(
      validState({ firstName: "", lastName: "", email: "nope" }),
      [],
      []
    );
    expect(errors.firstName).toBeDefined();
    expect(errors.lastName).toBeDefined();
    expect(errors.email).toBeDefined();
  });

  it("requires a ticket when the event has tickets", () => {
    const errors = validateRegistrationForm(validState({ ticketId: "" }), questions, tickets);
    expect(errors.ticketId).toBe("Please choose a ticket");
  });

  it("skips the ticket requirement when there are no tickets", () => {
    expect(validateRegistrationForm(validState({ ticketId: "" }), [], [])).toEqual({});
  });

  it("flags unanswered required questions", () => {
    const errors = validateRegistrationForm(validState({ answers: {} }), questions, tickets);
    expect(errors.answers?.q1).toBe("This question is required");
  });

  it("allows unanswered optional questions", () => {
    const errors = validateRegistrationForm(validState({ answers: { q1: "Konneqta" } }), questions, tickets);
    expect(errors.answers).toBeUndefined();
  });

  it("validates number answers", () => {
    const errors = validateRegistrationForm(
      validState({ answers: { q1: "K", q4: "lots" } }),
      questions,
      tickets
    );
    expect(errors.answers?.q4).toBe("Enter a number");
  });

  it("rejects choice answers outside the options", () => {
    const errors = validateRegistrationForm(
      validState({ answers: { q1: "K", q2: "XXL" } }),
      questions,
      tickets
    );
    expect(errors.answers?.q2).toBe("Choose one of the listed options");
  });

  it("accepts checkbox arrays within the options", () => {
    const errors = validateRegistrationForm(
      validState({ answers: { q1: "K", q3: ["Lunch"] } }),
      questions,
      tickets
    );
    expect(errors.answers).toBeUndefined();
  });
});

describe("buildAnswersPayload", () => {
  it("emits one row per question with normalized answers", () => {
    const payload = buildAnswersPayload(
      validState({ answers: { q1: "  Konneqta  ", q3: ["Lunch", "Workshop"] } }),
      questions
    );
    expect(payload).toHaveLength(4);
    expect(payload[0]).toMatchObject({ questionId: "q1", answer: "Konneqta" });
    expect(payload[2]).toMatchObject({ answerType: "checkbox", answer: ["Lunch", "Workshop"] });
    // Unanswered optional questions ride along empty.
    expect(payload[1]).toMatchObject({ questionId: "q2", answer: "" });
  });
});

describe("emptyRegistrationForm", () => {
  it("prefills from the signed-in viewer", () => {
    expect(
      emptyRegistrationForm({ firstName: "Ada", lastName: "Obi", email: "ada@example.com" })
    ).toMatchObject({ firstName: "Ada", lastName: "Obi", email: "ada@example.com", ticketId: "" });
  });

  it("starts blank without a viewer", () => {
    expect(emptyRegistrationForm(null)).toMatchObject({ firstName: "", ticketId: "" });
  });
});

describe("registrationErrorMessage", () => {
  it("maps every known RPC error to friendly copy", () => {
    expect(registrationErrorMessage("event_full")).toMatch(/full/i);
    expect(registrationErrorMessage("already_registered")).toMatch(/already registered/i);
    expect(registrationErrorMessage("registration_not_open")).toMatch(/hasn't opened/i);
    expect(registrationErrorMessage("unknown_code")).toMatch(/try again/i);
  });
});
