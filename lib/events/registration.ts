/* ── Attendee registration form — state, validation, RPC payload ─────────
 *
 * The public form on /e/[id]: first name / last name / email are always
 * collected (prefilled from the signed-in profile), plus a ticket choice
 * when the event has tickets and the organizer's custom questions from
 * Step 3 (attendee_questions). Everything is validated client-side with
 * Joi (same style as the wizard's validation.ts) and enforced again
 * server-side by the register_attendee RPC.
 */

import Joi from "joi";

import type { PublicTicket } from "./public";
import type { AttendeeQuestion } from "./types";

/** Answers keyed by question id — string, or string[] for checkbox groups. */
export type AnswerValue = string | string[];

export type RegistrationFormState = {
  firstName: string;
  lastName: string;
  email: string;
  /** "" — no ticket chosen (events without tickets). */
  ticketId: string;
  answers: Record<string, AnswerValue>;
};

export type RegistrationFormErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  ticketId?: string;
  /** Per-question messages keyed by question id. */
  answers?: Record<string, string>;
};

/** One persisted answer row — mirrors the question it answers. */
export type RegistrationAnswer = {
  questionId: string;
  label: string;
  answerType: string;
  answer: AnswerValue;
};

/** Blank form — prefilled from the signed-in viewer when available. */
export function emptyRegistrationForm(
  viewer?: { firstName: string; lastName: string; email: string } | null
): RegistrationFormState {
  return {
    firstName: viewer?.firstName ?? "",
    lastName: viewer?.lastName ?? "",
    email: viewer?.email ?? "",
    ticketId: "",
    answers: {},
  };
}

const NAME_LIMITS = { min: 2, max: 60 } as const;

const identitySchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(NAME_LIMITS.min)
    .max(NAME_LIMITS.max)
    .required()
    .messages({
      "string.empty": "First name is required",
      "string.min": `First name must be at least ${NAME_LIMITS.min} characters`,
      "string.max": `First name must be ${NAME_LIMITS.max} characters or fewer`,
    }),
  lastName: Joi.string()
    .trim()
    .min(NAME_LIMITS.min)
    .max(NAME_LIMITS.max)
    .required()
    .messages({
      "string.empty": "Last name is required",
      "string.min": `Last name must be at least ${NAME_LIMITS.min} characters`,
      "string.max": `Last name must be ${NAME_LIMITS.max} characters or fewer`,
    }),
  email: Joi.string()
    .trim()
    .email({ tlds: false })
    .max(254)
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Enter a valid email address",
    }),
});

/** Normalize an answer value for emptiness/format checks. */
function answerText(value: AnswerValue | undefined): string {
  if (value == null) return "";
  return Array.isArray(value) ? value.filter(Boolean).join(", ") : value.trim();
}

/**
 * Validate the form → error map. Questions are checked against their
 * answerType: required ones must be answered, number/email answers must
 * parse, and choice answers must be among the defined options.
 */
export function validateRegistrationForm(
  state: RegistrationFormState,
  questions: AttendeeQuestion[],
  tickets: PublicTicket[]
): RegistrationFormErrors {
  const errors: RegistrationFormErrors = {};

  const { error } = identitySchema.validate(
    { firstName: state.firstName, lastName: state.lastName, email: state.email },
    { abortEarly: false, stripUnknown: true }
  );
  if (error) {
    for (const detail of error.details) {
      const key = detail.path[0] as "firstName" | "lastName" | "email";
      if (!errors[key]) errors[key] = detail.message;
    }
  }

  // A ticket is required whenever the event defines any.
  if (tickets.length > 0 && !tickets.some((ticket) => ticket.id === state.ticketId)) {
    errors.ticketId = "Please choose a ticket";
  }

  const answerErrors: Record<string, string> = {};
  for (const question of questions) {
    const raw = state.answers[question.id];
    const text = answerText(raw);

    if (question.required && text === "") {
      answerErrors[question.id] = "This question is required";
      continue;
    }
    if (text === "") continue; // optional and unanswered — fine

    if (question.answerType === "number" && !/^-?\d+(\.\d+)?$/.test(text)) {
      answerErrors[question.id] = "Enter a number";
    } else if (question.answerType === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      answerErrors[question.id] = "Enter a valid email address";
    } else if (
      question.answerType === "dropdown" ||
      question.answerType === "multiple_choice" ||
      question.answerType === "checkbox"
    ) {
      const chosen = Array.isArray(raw) ? raw : text ? [text] : [];
      if (chosen.some((option) => !question.options.includes(option))) {
        answerErrors[question.id] = "Choose one of the listed options";
      }
    }
  }
  if (Object.keys(answerErrors).length > 0) errors.answers = answerErrors;

  return errors;
}

/**
 * Build the answers payload for the register_attendee RPC — one row per
 * question, unanswered optional questions included with an empty answer so
 * the organizer's table always shows the full set.
 */
export function buildAnswersPayload(
  state: RegistrationFormState,
  questions: AttendeeQuestion[]
): RegistrationAnswer[] {
  return questions.map((question) => {
    const raw = state.answers[question.id];
    const answer: AnswerValue =
      question.answerType === "checkbox" ? (Array.isArray(raw) ? raw : []) : answerText(raw);
    return {
      questionId: question.id,
      label: question.label,
      answerType: question.answerType,
      answer,
    };
  });
}

/** Friendly toast copy per register_attendee error code. */
export function registrationErrorMessage(code: string): string {
  switch (code) {
    case "already_registered":
      return "You're already registered for this event";
    case "registration_closed":
      return "Registration is closed";
    case "registration_not_open":
      return "Registration hasn't opened yet";
    case "event_full":
      return "This event is full";
    case "event_cancelled":
      return "This event has been cancelled";
    case "not_found":
      return "This event isn't available";
    case "invalid_ticket":
      return "That ticket isn't available — pick another";
    case "sign_in_required":
      return "Please sign in to register";
    default:
      return "Could not register — please try again";
  }
}

