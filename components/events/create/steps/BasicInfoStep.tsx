"use client";

import type { ReactNode } from "react";

import CoverImageInput from "@/components/events/create/CoverImageInput";
import TagInput from "@/components/events/create/TagInput";
import {
  EVENT_CATEGORIES,
  EVENT_TYPES,
  FIELD_LIMITS,
  OTHER_CATEGORY,
} from "@/lib/events/constants";
import type { BasicInfoData, BasicInfoErrors } from "@/lib/events/types";

/* ── Shared input styling — rounded-xl + orange focus, like the auth forms */

const inputClasses = (hasError?: string) =>
  `w-full rounded-xl border bg-transparent px-3.5 py-2.5 text-sm text-foreground placeholder:text-zinc-400 focus:outline-none dark:placeholder:text-zinc-500 ${
    hasError
      ? "border-red-500 focus:border-red-500"
      : "border-border focus:border-(--main-orange) dark:border-zinc-700"
  }`;

const ERROR_TEXT_CLASSES = "mt-1.5 text-xs text-red-500";

/** Small "x / max" counter shown beside labels. */
function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <span
      className={`text-xs tabular-nums ${
        value.length > max ? "text-red-500" : "text-secondary-text dark:text-zinc-500"
      }`}
    >
      {value.length}/{max}
    </span>
  );
}

/* Event type card icons (Heroicons outline, same style as the dashboard). */

function InPersonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function OnlineIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function HybridIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

const EVENT_TYPE_ICONS: Record<string, ReactNode> = {
  in_person: <InPersonIcon />,
  online: <OnlineIcon />,
  hybrid: <HybridIcon />,
};

/**
 * Step 1 — Basic Information. Every field lives in the wizard's form
 * state (CreateEventWizard); this component is pure presentation plus
 * per-field error display, matching the auth forms' look.
 */
export default function BasicInfoStep({
  data,
  errors,
  onChange,
}: {
  data: BasicInfoData;
  errors: BasicInfoErrors;
  onChange: (patch: Partial<BasicInfoData>) => void;
}) {
  return (
    <section className="flex flex-col gap-6">
      {/* Event Name — the only required field to continue */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="event-name" className="text-sm font-medium">
            Event Name <span className="text-(--main-orange)">*</span>
          </label>
          <CharCount value={data.name} max={FIELD_LIMITS.nameMax} />
        </div>
        <input
          id="event-name"
          type="text"
          value={data.name}
          maxLength={FIELD_LIMITS.nameMax}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Konneqta Tech Connect 2026"
          aria-invalid={Boolean(errors.name)}
          className={inputClasses(errors.name)}
        />
        {errors.name && (
          <p data-field-error className={ERROR_TEXT_CLASSES}>
            {errors.name}
          </p>
        )}
      </div>

      {/* Event Theme — short tagline */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="event-theme" className="text-sm font-medium">
            Event Theme
          </label>
          <CharCount value={data.theme} max={FIELD_LIMITS.themeMax} />
        </div>
        <input
          id="event-theme"
          type="text"
          value={data.theme}
          maxLength={FIELD_LIMITS.themeMax}
          onChange={(e) => onChange({ theme: e.target.value })}
          placeholder="A short tagline, e.g. Building the future together"
          aria-invalid={Boolean(errors.theme)}
          className={inputClasses(errors.theme)}
        />
        {errors.theme && (
          <p data-field-error className={ERROR_TEXT_CLASSES}>
            {errors.theme}
          </p>
        )}
      </div>

      {/* Event Description */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="event-description" className="text-sm font-medium">
            Event Description
          </label>
          <CharCount value={data.description} max={FIELD_LIMITS.descriptionMax} />
        </div>
        <textarea
          id="event-description"
          rows={6}
          value={data.description}
          maxLength={FIELD_LIMITS.descriptionMax}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What should guests expect? Share the highlights…"
          aria-invalid={Boolean(errors.description)}
          className={`${inputClasses(errors.description)} resize-y`}
        />
        {errors.description && (
          <p data-field-error className={ERROR_TEXT_CLASSES}>
            {errors.description}
          </p>
        )}
      </div>

      {/* Event Category — "Other" reveals a custom text input */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-category" className="text-sm font-medium">
          Event Category
        </label>
        <select
          id="event-category"
          value={data.category}
          onChange={(e) => onChange({ category: e.target.value })}
          aria-invalid={Boolean(errors.category)}
          className={`${inputClasses(errors.category)} bg-background dark:bg-zinc-900`}
        >
          <option value="">Select a category</option>
          {EVENT_CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
        {errors.category && (
          <p data-field-error className={ERROR_TEXT_CLASSES}>
            {errors.category}
          </p>
        )}
        {data.category === OTHER_CATEGORY && (
          <div className="mt-3 flex flex-col gap-1.5">
            <label htmlFor="event-category-other" className="text-sm font-medium">
              What kind of event is it? <span className="text-(--main-orange)">*</span>
            </label>
            <input
              id="event-category-other"
              type="text"
              value={data.categoryOther}
              maxLength={FIELD_LIMITS.categoryOtherMax}
              onChange={(e) => onChange({ categoryOther: e.target.value })}
              placeholder="Tell us what to call it"
              aria-invalid={Boolean(errors.categoryOther)}
              className={inputClasses(errors.categoryOther)}
            />
            {errors.categoryOther && (
              <p data-field-error className={ERROR_TEXT_CLASSES}>
                {errors.categoryOther}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Event Type — selectable cards */}
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">Event Type</legend>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {EVENT_TYPES.map((type) => {
            const checked = data.eventType === type.value;
            return (
              <label key={type.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="eventType"
                  value={type.value}
                  checked={checked}
                  onChange={() => onChange({ eventType: type.value })}
                  className="sr-only"
                />
                <div
                  className={`flex h-full flex-col gap-1.5 rounded-xl border p-4 transition-colors ${
                    checked
                      ? "border-(--main-orange) bg-main-orange/5"
                      : "border-border hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
                  }`}
                >
                  <span className={checked ? "text-(--main-orange)" : "text-zinc-400"}>
                    {EVENT_TYPE_ICONS[type.value]}
                  </span>
                  <span className="text-sm font-semibold">{type.label}</span>
                  <span className="text-xs leading-5 text-secondary-text dark:text-zinc-400">
                    {type.description}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
        {errors.eventType && (
          <p data-field-error className={ERROR_TEXT_CLASSES}>
            {errors.eventType}
          </p>
        )}
      </fieldset>

      {/* Cover Image */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Cover Image</span>
        <CoverImageInput
          coverImage={data.coverImage}
          coverImageUrl={data.coverImageUrl}
          error={errors.coverImage}
          onChange={onChange}
        />
      </div>

      {/* Hashtags */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Hashtags</span>
        <TagInput
          tags={data.hashtags}
          error={errors.hashtags}
          onChange={(tags) => onChange({ hashtags: tags })}
        />
      </div>
    </section>
  );
}
