/* ── Create-event wizard — canonical options, step list, and limits ──────
 *
 * Single source of truth shared by the wizard UI
 * (components/events/create), the validation schemas (validation.ts) and
 * the values written to public.events by the draft save. Keep event_type
 * values in sync with the CHECK constraint in supabase/schema.sql —
 * categories are app-validated only so the list can grow without a
 * migration.
 */

export const EVENT_CATEGORIES = [
  { value: "conference", label: "Conference" },
  { value: "workshop", label: "Workshop" },
  { value: "seminar", label: "Seminar" },
  { value: "meetup", label: "Meetup" },
  { value: "training", label: "Training" },
  { value: "networking", label: "Networking" },
  { value: "concert", label: "Concert" },
  { value: "exhibition", label: "Exhibition" },
  { value: "career", label: "Career" },
  { value: "hackathon", label: "Hackathon" },
  { value: "corporate", label: "Corporate" },
  { value: "other", label: "Other" },
] as const;

/** Selected when the attendee types their own category (category_other). */
export const OTHER_CATEGORY = "other";

export const EVENT_TYPES = [
  {
    value: "in_person",
    label: "In Person",
    description: "Guests attend a physical venue",
  },
  {
    value: "online",
    label: "Online",
    description: "Streamed — join from anywhere",
  },
  {
    value: "hybrid",
    label: "Hybrid",
    description: "Both a venue and a live stream",
  },
] as const;

/**
 * The 6-step flow. Steps 1–5 are fully built; step 6 is a placeholder
 * this milestone — the label will evolve as the step gets specced.
 */
export const WIZARD_STEPS = [
  { step: 1, label: "Basic Information" },
  { step: 2, label: "Date, Time & Location" },
  { step: 3, label: "Registration" },
  { step: 4, label: "Tickets" },
  { step: 5, label: "Event Details" },
  { step: 6, label: "Review & Publish" },
] as const;

export const TOTAL_STEPS = WIZARD_STEPS.length;

/** Text field caps (enforced by validation.ts and the inputs' maxLength). */
export const FIELD_LIMITS = {
  nameMin: 2,
  nameMax: 100,
  themeMax: 120,
  descriptionMax: 2000,
  categoryOtherMax: 60,
} as const;

export const HASHTAG_LIMITS = {
  maxTags: 10,
  maxLength: 30,
} as const;

export const COVER_IMAGE_RULES = {
  recommendedWidth: 1200,
  recommendedHeight: 630,
  maxSizeMb: 5,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  acceptedExtensions: ".jpg,.jpeg,.png,.webp",
} as const;

/**
 * Online platforms — used both for the primary meeting/event link and the
 * extra streaming outlets (Step 2, online/hybrid events).
 */
export const MEETING_PLATFORMS = [
  { value: "zoom", label: "Zoom" },
  { value: "google_meet", label: "Google Meet" },
  { value: "microsoft_teams", label: "Microsoft Teams" },
  { value: "youtube_live", label: "YouTube Live" },
  { value: "facebook_live", label: "Facebook Live" },
  { value: "instagram_live", label: "Instagram Live" },
  { value: "twitch", label: "Twitch" },
  { value: "other", label: "Other" },
] as const;

/** Step 2 caps — venue/text lengths and the streaming-outlet rows. */
export const LOCATION_LIMITS = {
  venueNameMin: 2,
  venueNameMax: 120,
  addressMin: 3,
  addressMax: 200,
  cityMin: 2,
  cityMax: 80,
  countryMin: 2,
  countryMax: 80,
  mapLocationMax: 500,
  meetingLinkMax: 500,
  meetingIdMax: 50,
  maxOutlets: 5,
} as const;

/** Countries for the venue country dropdown (ISO English short names). */
export const COUNTRIES = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo (Brazzaville)",
  "Congo (Kinshasa)",
  "Costa Rica",
  "Côte d'Ivoire",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czechia",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "São Tomé and Príncipe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
] as const;

/** Custom attendee-question answer types (Step 3). */
export const ANSWER_TYPES = [
  { value: "short_answer", label: "Short answer", needsOptions: false },
  { value: "long_answer", label: "Long answer", needsOptions: false },
  { value: "email", label: "Email", needsOptions: false },
  { value: "phone", label: "Phone", needsOptions: false },
  { value: "number", label: "Number", needsOptions: false },
  { value: "dropdown", label: "Dropdown", needsOptions: true },
  { value: "multiple_choice", label: "Multiple choice", needsOptions: true },
  { value: "checkbox", label: "Checkbox", needsOptions: true },
] as const;

/** True for choice types that define answer options (Dropdown etc.). */
export function answerTypeNeedsOptions(answerType: string): boolean {
  return ANSWER_TYPES.some((type) => type.value === answerType && type.needsOptions);
}

/** Step 3 caps — attendee count, questions and their options. */
export const REGISTRATION_LIMITS = {
  maxAttendeesCap: 1_000_000,
  questionMin: 2,
  questionMax: 200,
  maxQuestions: 20,
  optionMin: 2,
  optionMax: 20,
  optionMaxLen: 100,
} as const;

/** Step 4 — currencies a ticket can be priced in (payments-ready). */
export const TICKET_CURRENCIES = [
  { value: "NGN", label: "₦ NGN" },
  { value: "USD", label: "$ USD" },
  { value: "EUR", label: "€ EUR" },
  { value: "GBP", label: "£ GBP" },
  { value: "GHS", label: "₵ GHS" },
  { value: "KES", label: "KSh KES" },
] as const;

export const DEFAULT_TICKET_CURRENCY = "NGN";

/** Step 4 caps — ticket types and their fields. */
export const TICKET_LIMITS = {
  nameMin: 2,
  nameMax: 60,
  descriptionMax: 200,
  quantityCap: 1_000_000,
  priceMax: 10_000_000,
  maxTickets: 10,
} as const;

/** Step 5 — accessibility options surfaced on the public event page. */
export const ACCESSIBILITY_OPTIONS = [
  { value: "wheelchair_accessible", label: "Wheelchair accessible" },
  { value: "sign_language", label: "Sign-language interpretation" },
  { value: "captioning", label: "Captioning available" },
  { value: "accessible_parking", label: "Accessible parking" },
] as const;

/** Step 5 — age requirement radio options. */
export const AGE_RESTRICTION_OPTIONS = [
  { value: "all_ages", label: "All ages" },
  { value: "13_plus", label: "13+" },
  { value: "16_plus", label: "16+" },
  { value: "18_plus", label: "18+" },
  { value: "custom", label: "Custom" },
] as const;

/** Step 5 caps — Event Details text fields. */
export const DETAILS_LIMITS = {
  textMax: 500,
  additionalInfoMax: 1000,
  dressCodeMax: 60,
  ageNoteMax: 30,
} as const;
