import Joi from "joi";

import {
  ACCESSIBILITY_OPTIONS,
  AGE_RESTRICTION_OPTIONS,
  ANSWER_TYPES,
  DETAILS_LIMITS,
  EVENT_CATEGORIES,
  EVENT_TYPES,
  FIELD_LIMITS,
  HASHTAG_LIMITS,
  LOCATION_LIMITS,
  MEETING_PLATFORMS,
  OTHER_CATEGORY,
  REGISTRATION_LIMITS,
  TICKET_LIMITS,
  answerTypeNeedsOptions,
} from "./constants";
import type {
  BasicInfoData,
  BasicInfoErrors,
  EventDetailsData,
  EventDetailsErrors,
  RegistrationData,
  RegistrationErrors,
  ScheduleLocationData,
  ScheduleLocationErrors,
  TicketData,
  TicketFieldErrors,
  TicketsErrors,
} from "./types";

/* ── Step 1 "Basic Information" validation (Joi, like the auth forms) ──── */

const CATEGORY_VALUES = EVENT_CATEGORIES.map((category) => category.value);
const EVENT_TYPE_VALUES = EVENT_TYPES.map((type) => type.value);

const lengthMessage = (field: string, max: number) =>
  `${field} must be ${max} characters or fewer`;

/**
 * "Continue" — only the Event Name is required. Picking "Other" as a
 * category makes the custom text required; everything else is optional
 * but still length-capped.
 */
const basicInfoContinueSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(FIELD_LIMITS.nameMin)
    .max(FIELD_LIMITS.nameMax)
    .required()
    .messages({
      "string.empty": "Event name is required",
      "string.min": `Event name must be at least ${FIELD_LIMITS.nameMin} characters`,
      "string.max": lengthMessage("Event name", FIELD_LIMITS.nameMax),
    }),
  theme: Joi.string()
    .trim()
    .allow("")
    .max(FIELD_LIMITS.themeMax)
    .messages({
      "string.max": lengthMessage("Event theme", FIELD_LIMITS.themeMax),
    }),
  description: Joi.string()
    .trim()
    .allow("")
    .max(FIELD_LIMITS.descriptionMax)
    .messages({
      "string.max": lengthMessage("Event description", FIELD_LIMITS.descriptionMax),
    }),
  category: Joi.string()
    .valid(...CATEGORY_VALUES)
    .allow("")
    .messages({
      "any.only": "Please choose a valid category",
    }),
  categoryOther: Joi.when("category", {
    is: OTHER_CATEGORY,
    then: Joi.string()
      .trim()
      .min(2)
      .max(FIELD_LIMITS.categoryOtherMax)
      .required()
      .messages({
        "string.empty": "Tell us what kind of event this is",
        "string.min": "Please enter at least 2 characters",
        "string.max": lengthMessage("Custom category", FIELD_LIMITS.categoryOtherMax),
      }),
    otherwise: Joi.string().allow(""),
  }),
  eventType: Joi.string()
    .valid(...EVENT_TYPE_VALUES)
    .allow("")
    .messages({
      "any.only": "Please choose a valid event type",
    }),
  hashtags: Joi.array()
    .items(Joi.string().max(HASHTAG_LIMITS.maxLength))
    .max(HASHTAG_LIMITS.maxTags)
    .messages({
      "array.max": `You can add up to ${HASHTAG_LIMITS.maxTags} hashtags`,
      "string.max": `Each hashtag must be ${HASHTAG_LIMITS.maxLength} characters or fewer`,
    }),
});

/**
 * "Save as draft" — everything optional, only the length caps apply so a
 * draft can never hold oversize values.
 */
const basicInfoDraftSchema = basicInfoContinueSchema.keys({
  name: Joi.string()
    .trim()
    .allow("")
    .max(FIELD_LIMITS.nameMax)
    .messages({
      "string.max": lengthMessage("Event name", FIELD_LIMITS.nameMax),
    }),
  categoryOther: Joi.string()
    .trim()
    .allow("")
    .max(FIELD_LIMITS.categoryOtherMax)
    .messages({
      "string.max": lengthMessage("Custom category", FIELD_LIMITS.categoryOtherMax),
    }),
});

/**
 * Validate the Step 1 form for the given mode → a per-field error map
 * (first message wins when a field has several problems).
 */
export function validateBasicInfo(
  data: BasicInfoData,
  mode: "draft" | "continue"
): BasicInfoErrors {
  const schema = mode === "continue" ? basicInfoContinueSchema : basicInfoDraftSchema;
  const { error } = schema.validate(
    {
      name: data.name,
      theme: data.theme,
      description: data.description,
      category: data.category,
      categoryOther: data.categoryOther,
      eventType: data.eventType,
      hashtags: data.hashtags,
    },
    { abortEarly: false, stripUnknown: true }
  );

  if (!error) return {};

  const errors: BasicInfoErrors = {};
  for (const detail of error.details) {
    const key = detail.path[0] as keyof BasicInfoData;
    if (!errors[key]) errors[key] = detail.message;
  }
  return errors;
}

/* ── Step 2 "Date, Time & Location" validation ─────────────────────────── */

const PLATFORM_VALUES = MEETING_PLATFORMS.map((platform) => platform.value);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const requiredText = (label: string, min: number, max: number) =>
  Joi.string()
    .trim()
    .min(min)
    .max(max)
    .required()
    .messages({
      "string.empty": `${label} is required`,
      "string.min": `${label} must be at least ${min} characters`,
      "string.max": `${label} must be ${max} characters or fewer`,
    });

/** URL fields — Joi's uri() runs only when a value is present. */
const optionalUrl = (label: string) =>
  Joi.string()
    .trim()
    .allow("")
    .max(LOCATION_LIMITS.meetingLinkMax)
    .uri({ scheme: ["http", "https"] })
    .messages({
      "string.uri": `${label} must be a full URL starting with http:// or https://`,
      "string.max": `${label} must be ${LOCATION_LIMITS.meetingLinkMax} characters or fewer`,
    });

const requiredUrl = (label: string) =>
  Joi.string()
    .trim()
    .max(LOCATION_LIMITS.meetingLinkMax)
    .uri({ scheme: ["http", "https"] })
    .required()
    .messages({
      "string.empty": `${label} is required`,
      "string.uri": `${label} must be a full URL starting with http:// or https://`,
      "string.max": `${label} must be ${LOCATION_LIMITS.meetingLinkMax} characters or fewer`,
    });

/** IANA zone check — Intl accepts a zone name or throws. */
const validTimeZone = Joi.string()
  .trim()
  .custom((value, helpers) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value });
      return value;
    } catch {
      return helpers.error("any.invalid");
    }
  })
  .messages({ "any.invalid": "Please choose a valid time zone" });

/** Lenient Step 2 schema — everything optional, formats still enforced. */
const scheduleDraftSchema = Joi.object({
  startDate: Joi.string().allow("").pattern(DATE_PATTERN).messages({
    "string.pattern.base": "Please pick a valid start date",
  }),
  endDate: Joi.string().allow("").pattern(DATE_PATTERN).messages({
    "string.pattern.base": "Please pick a valid end date",
  }),
  startTime: Joi.string().allow("").pattern(TIME_PATTERN).messages({
    "string.pattern.base": "Please pick a valid start time",
  }),
  endTime: Joi.string().allow("").pattern(TIME_PATTERN).messages({
    "string.pattern.base": "Please pick a valid end time",
  }),
  timezone: validTimeZone.allow(""),
  venueName: Joi.string().trim().allow("").max(LOCATION_LIMITS.venueNameMax).messages({
    "string.max": `Venue name must be ${LOCATION_LIMITS.venueNameMax} characters or fewer`,
  }),
  venueAddress: Joi.string().trim().allow("").max(LOCATION_LIMITS.addressMax).messages({
    "string.max": `Address must be ${LOCATION_LIMITS.addressMax} characters or fewer`,
  }),
  venueCity: Joi.string().trim().allow("").max(LOCATION_LIMITS.cityMax).messages({
    "string.max": `City must be ${LOCATION_LIMITS.cityMax} characters or fewer`,
  }),
  venueCountry: Joi.string().trim().allow("").max(LOCATION_LIMITS.countryMax).messages({
    "string.max": "Please choose a valid country",
  }),
  mapLocation: Joi.string().trim().allow("").max(LOCATION_LIMITS.mapLocationMax).messages({
    "string.max": `Map location must be ${LOCATION_LIMITS.mapLocationMax} characters or fewer`,
  }),
  platform: Joi.string().valid(...PLATFORM_VALUES).allow("").messages({
    "any.only": "Please choose a valid platform",
  }),
  meetingLink: optionalUrl("Meeting link"),
  meetingId: Joi.string().trim().allow("").max(LOCATION_LIMITS.meetingIdMax).messages({
    "string.max": `Meeting ID must be ${LOCATION_LIMITS.meetingIdMax} characters or fewer`,
  }),
  outlets: Joi.array()
    .max(LOCATION_LIMITS.maxOutlets)
    .items(
      Joi.object({
        platform: Joi.string().valid(...PLATFORM_VALUES).allow("").messages({
          "any.only": "Choose a platform for each outlet",
        }),
        link: optionalUrl("Outlet link"),
      })
    )
    .messages({
      "array.max": `You can add up to ${LOCATION_LIMITS.maxOutlets} streaming outlets`,
    }),
});

/** Strict additions — start date/time + zone always when continuing. */
const scheduleContinueKeys = {
  startDate: Joi.string().pattern(DATE_PATTERN).required().messages({
    "string.empty": "Start date is required",
    "string.pattern.base": "Please pick a valid start date",
  }),
  startTime: Joi.string().pattern(TIME_PATTERN).required().messages({
    "string.empty": "Start time is required",
    "string.pattern.base": "Please pick a valid start time",
  }),
  timezone: validTimeZone.required().messages({
    "string.empty": "Please choose a time zone",
    "any.required": "Please choose a time zone",
  }),
};

/** Venue block (in-person + hybrid). */
const venueKeys = {
  venueName: requiredText("Venue name", LOCATION_LIMITS.venueNameMin, LOCATION_LIMITS.venueNameMax),
  venueAddress: requiredText("Address", LOCATION_LIMITS.addressMin, LOCATION_LIMITS.addressMax),
  venueCity: requiredText("City", LOCATION_LIMITS.cityMin, LOCATION_LIMITS.cityMax),
  venueCountry: requiredText("Country", LOCATION_LIMITS.countryMin, LOCATION_LIMITS.countryMax),
};

/** Online block (online + hybrid). */
const onlineKeys = {
  platform: Joi.string()
    .valid(...PLATFORM_VALUES)
    .required()
    .messages({
      "string.empty": "Please choose a platform",
      "any.required": "Please choose a platform",
      "any.only": "Please choose a valid platform",
    }),
  meetingLink: requiredUrl("Meeting link"),
};

/**
 * Validate Step 2 for the given mode and effective event type — venue
 * fields are required for in-person (the default when Step 1 has no type
 * picked yet) and hybrid; platform + meeting link for online and hybrid.
 * End date/time must come after the start when provided.
 */
export function validateScheduleLocation(
  data: ScheduleLocationData,
  effectiveEventType: string,
  mode: "draft" | "continue"
): ScheduleLocationErrors {
  let schema = scheduleDraftSchema;
  if (mode === "continue") {
    schema = schema.keys(scheduleContinueKeys);
    const needsVenue = effectiveEventType === "in_person" || effectiveEventType === "hybrid";
    const needsOnline = effectiveEventType === "online" || effectiveEventType === "hybrid";
    if (needsVenue) schema = schema.keys(venueKeys);
    if (needsOnline) schema = schema.keys(onlineKeys);
  }

  const { error } = schema.validate(
    {
      startDate: data.startDate,
      endDate: data.endDate,
      startTime: data.startTime,
      endTime: data.endTime,
      timezone: data.timezone,
      venueName: data.venueName,
      venueAddress: data.venueAddress,
      venueCity: data.venueCity,
      venueCountry: data.venueCountry,
      mapLocation: data.mapLocation,
      platform: data.platform,
      meetingLink: data.meetingLink,
      meetingId: data.meetingId,
      outlets: data.outlets,
    },
    { abortEarly: false, stripUnknown: true }
  );

  const errors: ScheduleLocationErrors = {};
  if (error) {
    for (const detail of error.details) {
      const key = detail.path[0] as keyof ScheduleLocationData;
      if (!errors[key]) errors[key] = detail.message;
    }
  }

  // Cross-field timing checks (ISO strings compare chronologically).
  if (!errors.endDate && data.startDate && data.endDate && data.endDate < data.startDate) {
    errors.endDate = "End date can't be before the start date";
  }
  const sameDay = !data.endDate || data.endDate === data.startDate;
  if (
    !errors.endTime &&
    data.startDate &&
    sameDay &&
    data.startTime &&
    data.endTime &&
    data.endTime <= data.startTime
  ) {
    errors.endTime = "End time must be after the start time";
  }

  return errors;
}

/* ── Step 3 "Registration" validation ──────────────────────────────────── */

const ANSWER_TYPE_VALUES: string[] = ANSWER_TYPES.map((type) => type.value);
const STATUS_VALUES = ["open", "scheduled", "closed"];
const CAPACITY_VALUES = ["unlimited", "limited"];
const APPROVAL_VALUES = ["automatic", "manual"];

/**
 * Validate Step 3. Strict (Continue/Finish): scheduled registration needs
 * an open date (close optional but not earlier); limited capacity needs a
 * maximum; every question needs a unique label, a valid answer type and —
 * for choice types — at least two unique options. Lenient (draft): format
 * and cap checks only.
 */
export function validateRegistration(
  data: RegistrationData,
  mode: "draft" | "continue"
): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const strict = mode === "continue";

  if (!STATUS_VALUES.includes(data.status)) {
    errors.status = "Please choose a registration status";
  }
  if (!CAPACITY_VALUES.includes(data.capacityType)) {
    errors.capacityType = "Please choose a capacity option";
  }
  if (!APPROVAL_VALUES.includes(data.approvalType)) {
    errors.approvalType = "Please choose an approval mode";
  }

  if (data.status === "scheduled") {
    if (data.opensOn && !DATE_PATTERN.test(data.opensOn)) {
      errors.opensOn = "Please pick a valid open date";
    } else if (strict && !data.opensOn) {
      errors.opensOn = "Registration open date is required";
    }
    if (data.closesOn && !DATE_PATTERN.test(data.closesOn)) {
      errors.closesOn = "Please pick a valid close date";
    } else if (
      !errors.opensOn &&
      !errors.closesOn &&
      data.opensOn &&
      data.closesOn &&
      data.closesOn < data.opensOn
    ) {
      errors.closesOn = "Close date can't be before the open date";
    }
  }

  if (data.capacityType === "limited") {
    const raw = data.maxAttendees.trim();
    const parsed = Number(raw);
    if (raw === "") {
      if (strict) errors.maxAttendees = "Maximum attendees is required";
    } else if (!Number.isInteger(parsed) || parsed < 1) {
      errors.maxAttendees = "Enter a whole number of 1 or more";
    } else if (parsed > REGISTRATION_LIMITS.maxAttendeesCap) {
      errors.maxAttendees = `Keep it under ${REGISTRATION_LIMITS.maxAttendeesCap.toLocaleString("en-US")}`;
    }
  }

  if (data.questions.length > REGISTRATION_LIMITS.maxQuestions) {
    errors.questions = `You can add up to ${REGISTRATION_LIMITS.maxQuestions} questions`;
  } else {
    const labels = new Set<string>();
    for (const question of data.questions) {
      const label = question.label.trim();
      if (label.length > REGISTRATION_LIMITS.questionMax) {
        errors.questions = `Questions must be ${REGISTRATION_LIMITS.questionMax} characters or fewer`;
        break;
      }
      if (strict && label.length < REGISTRATION_LIMITS.questionMin) {
        errors.questions = `Questions must be at least ${REGISTRATION_LIMITS.questionMin} characters`;
        break;
      }
      if (strict && !ANSWER_TYPE_VALUES.includes(question.answerType)) {
        errors.questions = "One of the questions has an invalid answer type";
        break;
      }
      const key = label.toLowerCase();
      if (strict && labels.has(key)) {
        errors.questions = "Two questions have the same wording — make each unique";
        break;
      }
      labels.add(key);
      if (answerTypeNeedsOptions(question.answerType)) {
        const options = question.options.map((option) => option.trim()).filter(Boolean);
        if (options.length > REGISTRATION_LIMITS.optionMax) {
          errors.questions = `Questions can have at most ${REGISTRATION_LIMITS.optionMax} options`;
          break;
        }
        if (options.some((option) => option.length > REGISTRATION_LIMITS.optionMaxLen)) {
          errors.questions = `Options must be ${REGISTRATION_LIMITS.optionMaxLen} characters or fewer`;
          break;
        }
        if (strict && options.length < REGISTRATION_LIMITS.optionMin) {
          errors.questions = "Choice questions need at least 2 options";
          break;
        }
        if (
          strict &&
          new Set(options.map((option) => option.toLowerCase())).size !== options.length
        ) {
          errors.questions = "Options within a question must be unique";
          break;
        }
      }
    }
  }

  return errors;
}

/* ── Step 4 "Tickets" validation ───────────────────────────────────────── */

/** Up to 7 digits with an optional 2-decimal fraction (2500 / 2500.50). */
const PRICE_PATTERN = /^\d{1,7}(\.\d{1,2})?$/;

/**
 * Validate Step 4. Strict (Continue/Finish): at least one ticket, every
 * ticket needs a unique name and a whole-number quantity of 1 or more;
 * price is a non-negative amount within the cap; the optional sales
 * window can't end before it starts. Lenient (draft): format and cap
 * checks on whatever is filled in.
 */
export function validateTickets(
  data: TicketData[],
  mode: "draft" | "continue"
): TicketsErrors {
  const errors: TicketsErrors = {};
  const items: Record<string, TicketFieldErrors> = {};
  const strict = mode === "continue";

  if (data.length > TICKET_LIMITS.maxTickets) {
    errors.tickets = `You can add up to ${TICKET_LIMITS.maxTickets} ticket types`;
  }

  if (strict && data.length === 0) {
    errors.tickets = "Your event needs at least one ticket type";
  }

  const names = new Set<string>();
  for (const ticket of data) {
    const item: TicketFieldErrors = {};

    const name = ticket.name.trim();
    if (name === "") {
      if (strict) item.name = "Ticket name is required";
    } else if (name.length < TICKET_LIMITS.nameMin) {
      item.name = `At least ${TICKET_LIMITS.nameMin} characters`;
    } else if (name.length > TICKET_LIMITS.nameMax) {
      item.name = `Keep it under ${TICKET_LIMITS.nameMax} characters`;
    } else if (strict && names.has(name.toLowerCase())) {
      item.name = "Two tickets share this name — make each unique";
    }
    if (name) names.add(name.toLowerCase());

    const price = ticket.price.trim();
    if (price !== "" && !PRICE_PATTERN.test(price)) {
      item.price = "Enter a valid amount (e.g. 2500 or 2500.50)";
    } else if (price !== "" && Number(price) > TICKET_LIMITS.priceMax) {
      item.price = "Price is too high";
    }

    const quantity = ticket.quantity.trim();
    if (quantity === "") {
      if (strict) item.quantity = "Quantity is required";
    } else if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
      item.quantity = "Enter a whole number of 1 or more";
    } else if (Number(quantity) > TICKET_LIMITS.quantityCap) {
      item.quantity = `Keep it under ${TICKET_LIMITS.quantityCap.toLocaleString("en-US")}`;
    }

    if (ticket.description.trim().length > TICKET_LIMITS.descriptionMax) {
      item.description = `Keep it under ${TICKET_LIMITS.descriptionMax} characters`;
    }

    if (ticket.salesStart && !DATE_PATTERN.test(ticket.salesStart)) {
      item.salesStart = "Please pick a valid start date";
    }
    if (ticket.salesEnd && !DATE_PATTERN.test(ticket.salesEnd)) {
      item.salesEnd = "Please pick a valid end date";
    } else if (
      !item.salesStart &&
      !item.salesEnd &&
      ticket.salesStart &&
      ticket.salesEnd &&
      ticket.salesEnd < ticket.salesStart
    ) {
      item.salesEnd = "Sales can't end before they start";
    }

    if (Object.keys(item).length > 0) items[ticket.id] = item;
  }

  if (Object.keys(items).length > 0) errors.items = items;
  return errors;
}

/* ── Step 5 "Event Details" validation ─────────────────────────────────── */

const AGE_RESTRICTION_VALUES: string[] = AGE_RESTRICTION_OPTIONS.map((option) => option.value);
const ACCESSIBILITY_VALUES: string[] = ACCESSIBILITY_OPTIONS.map((option) => option.value);

/**
 * Validate Step 5. Everything is optional public-page content: caps are
 * enforced in both modes, unknown radio/checkbox values are rejected, and
 * (strict) picking "Custom" as the age requirement requires the note.
 */
export function validateEventDetails(
  data: EventDetailsData,
  mode: "draft" | "continue"
): EventDetailsErrors {
  const errors: EventDetailsErrors = {};
  const strict = mode === "continue";

  if (data.whoShouldAttend.trim().length > DETAILS_LIMITS.textMax) {
    errors.whoShouldAttend = `Keep it under ${DETAILS_LIMITS.textMax} characters`;
  }
  if (data.whatToExpect.trim().length > DETAILS_LIMITS.textMax) {
    errors.whatToExpect = `Keep it under ${DETAILS_LIMITS.textMax} characters`;
  }
  if (data.requirements.trim().length > DETAILS_LIMITS.textMax) {
    errors.requirements = `Keep it under ${DETAILS_LIMITS.textMax} characters`;
  }
  if (data.dressCode.trim().length > DETAILS_LIMITS.dressCodeMax) {
    errors.dressCode = `Keep it under ${DETAILS_LIMITS.dressCodeMax} characters`;
  }
  if (data.additionalInfo.trim().length > DETAILS_LIMITS.additionalInfoMax) {
    errors.additionalInfo = `Keep it under ${DETAILS_LIMITS.additionalInfoMax} characters`;
  }

  if (data.accessibility.some((value) => !ACCESSIBILITY_VALUES.includes(value))) {
    errors.accessibility = "One of the accessibility options is invalid";
  }

  if (!AGE_RESTRICTION_VALUES.includes(data.ageRestriction)) {
    errors.ageRestriction = "Please choose an age requirement";
  } else if (data.ageRestriction === "custom") {
    const note = data.ageRestrictionCustom.trim();
    if (note === "") {
      if (strict) errors.ageRestrictionCustom = "Describe the custom age requirement";
    } else if (note.length > DETAILS_LIMITS.ageNoteMax) {
      errors.ageRestrictionCustom = `Keep it under ${DETAILS_LIMITS.ageNoteMax} characters`;
    }
  }

  return errors;
}
