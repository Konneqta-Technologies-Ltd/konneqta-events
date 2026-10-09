"use client";

import {
  ACCESSIBILITY_OPTIONS,
  AGE_RESTRICTION_OPTIONS,
  DETAILS_LIMITS,
} from "@/lib/events/constants";
import type { EventDetailsData, EventDetailsErrors } from "@/lib/events/types";

const ERROR_TEXT_CLASSES = "mt-1.5 text-xs text-red-500";

const inputClasses = (hasError?: string) =>
  `w-full rounded-xl border bg-transparent px-3.5 py-2.5 text-sm text-foreground placeholder:text-zinc-400 focus:outline-none dark:placeholder:text-zinc-500 ${
    hasError
      ? "border-red-500 focus:border-red-500"
      : "border-border focus:border-(--main-orange) dark:border-zinc-700"
  }`;

const textareaClasses = (hasError?: string) => `${inputClasses(hasError)} resize-none`;

const LABEL_CLASSES = "text-sm font-medium";
const GROUP_HEADING_CLASSES =
  "text-sm font-semibold uppercase tracking-wide text-secondary-text dark:text-zinc-400";

/** One selectable card-style checkbox option (sibling of RadioRow). */
function CheckboxRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
        checked
          ? "border-(--main-orange) bg-main-orange/5"
          : "border-border hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 cursor-pointer accent-(--main-orange)"
      />
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}

/** One selectable card-style radio option (custom dot, no native ring). */
function RadioRow({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
        checked
          ? "border-(--main-orange) bg-main-orange/5"
          : "border-border hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          checked ? "border-(--main-orange)" : "border-zinc-300 dark:border-zinc-600"
        }`}
      >
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-main-orange" />}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}

/**
 * Step 5 — Event Details. Everything that makes the public event page
 * richer, grouped in one place: audience, expectations, requirements,
 * dress code, accessibility, additional information and the age
 * requirement. All optional apart from the custom age note.
 */
export default function EventDetailsStep({
  data,
  errors,
  onChange,
}: {
  data: EventDetailsData;
  errors: EventDetailsErrors;
  onChange: (patch: Partial<EventDetailsData>) => void;
}) {
  const toggleAccessibility = (value: string, checked: boolean) =>
    onChange({
      accessibility: checked
        ? [...data.accessibility, value]
        : data.accessibility.filter((entry) => entry !== value),
    });

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">Event Details</h2>
        <p className="mt-1 text-sm text-secondary-text dark:text-zinc-400">
          The information that makes the public event page richer — share as
          much or as little as you like.
        </p>
      </div>

      {/* What attendees should know */}
      <div className="flex flex-col gap-4">
        <h3 className={GROUP_HEADING_CLASSES}>What attendees should know</h3>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="who-should-attend" className={LABEL_CLASSES}>
            Who should attend
          </label>
          <textarea
            id="who-should-attend"
            value={data.whoShouldAttend}
            maxLength={DETAILS_LIMITS.textMax}
            rows={3}
            onChange={(e) => onChange({ whoShouldAttend: e.target.value })}
            placeholder="e.g. Developers, founders, students and technology enthusiasts interested in Africa's tech ecosystem."
            className={textareaClasses(errors.whoShouldAttend)}
          />
          {errors.whoShouldAttend && (
            <p data-field-error className={ERROR_TEXT_CLASSES}>
              {errors.whoShouldAttend}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="what-to-expect" className={LABEL_CLASSES}>
            What to expect
          </label>
          <textarea
            id="what-to-expect"
            value={data.whatToExpect}
            maxLength={DETAILS_LIMITS.textMax}
            rows={3}
            onChange={(e) => onChange({ whatToExpect: e.target.value })}
            placeholder="e.g. Keynotes, networking, panel discussions, workshops and exhibitions."
            className={textareaClasses(errors.whatToExpect)}
          />
          {errors.whatToExpect && (
            <p data-field-error className={ERROR_TEXT_CLASSES}>
              {errors.whatToExpect}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="requirements" className={LABEL_CLASSES}>
            Requirements
          </label>
          <textarea
            id="requirements"
            value={data.requirements}
            maxLength={DETAILS_LIMITS.textMax}
            rows={2}
            onChange={(e) => onChange({ requirements: e.target.value })}
            placeholder="e.g. Bring your registration confirmation and ID."
            className={textareaClasses(errors.requirements)}
          />
          {errors.requirements && (
            <p data-field-error className={ERROR_TEXT_CLASSES}>
              {errors.requirements}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="dress-code" className={LABEL_CLASSES}>
            Dress code
          </label>
          <input
            id="dress-code"
            type="text"
            value={data.dressCode}
            maxLength={DETAILS_LIMITS.dressCodeMax}
            onChange={(e) => onChange({ dressCode: e.target.value })}
            placeholder="e.g. Smart casual"
            className={inputClasses(errors.dressCode)}
          />
          {errors.dressCode && (
            <p data-field-error className={ERROR_TEXT_CLASSES}>
              {errors.dressCode}
            </p>
          )}
        </div>
      </div>
      {/* Accessibility */}
      <div className="flex flex-col gap-3">
        <h3 className={GROUP_HEADING_CLASSES}>Accessibility information</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACCESSIBILITY_OPTIONS.map((option) => (
            <CheckboxRow
              key={option.value}
              label={option.label}
              checked={data.accessibility.includes(option.value)}
              onChange={(checked) => toggleAccessibility(option.value, checked)}
            />
          ))}
        </div>
        {errors.accessibility && (
          <p data-field-error className={ERROR_TEXT_CLASSES}>
            {errors.accessibility}
          </p>
        )}
      </div>

      {/* Additional information */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="additional-info" className={LABEL_CLASSES}>
          Additional information
        </label>
        <textarea
          id="additional-info"
          value={data.additionalInfo}
          maxLength={DETAILS_LIMITS.additionalInfoMax}
          rows={3}
          onChange={(e) => onChange({ additionalInfo: e.target.value })}
          placeholder="Anything else attendees should know — parking, refunds, contact info…"
          className={textareaClasses(errors.additionalInfo)}
        />
        {errors.additionalInfo && (
          <p data-field-error className={ERROR_TEXT_CLASSES}>
            {errors.additionalInfo}
          </p>
        )}
      </div>

      {/* Age requirement */}
      <div className="flex flex-col gap-3">
        <h3 className={GROUP_HEADING_CLASSES}>Age requirement</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AGE_RESTRICTION_OPTIONS.map((option) => (
            <RadioRow
              key={option.value}
              name="age-restriction"
              value={option.value}
              label={option.label}
              checked={data.ageRestriction === option.value}
              onChange={(value) => onChange({ ageRestriction: value })}
            />
          ))}
        </div>
        {errors.ageRestriction && (
          <p data-field-error className={ERROR_TEXT_CLASSES}>
            {errors.ageRestriction}
          </p>
        )}

        {data.ageRestriction === "custom" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="age-restriction-custom" className={LABEL_CLASSES}>
              Custom age requirement
            </label>
            <input
              id="age-restriction-custom"
              type="text"
              value={data.ageRestrictionCustom}
              maxLength={DETAILS_LIMITS.ageNoteMax}
              onChange={(e) => onChange({ ageRestrictionCustom: e.target.value })}
              placeholder="e.g. 21+"
              className={inputClasses(errors.ageRestrictionCustom)}
            />
            {errors.ageRestrictionCustom && (
              <p data-field-error className={ERROR_TEXT_CLASSES}>
                {errors.ageRestrictionCustom}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}


