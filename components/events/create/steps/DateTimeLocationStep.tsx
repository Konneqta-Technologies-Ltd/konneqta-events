"use client";

import { useEffect, useState } from "react";

import TimezoneSelect from "@/components/events/create/TimezoneSelect";
import { COUNTRIES, LOCATION_LIMITS, MEETING_PLATFORMS } from "@/lib/events/constants";
import type {
  ScheduleLocationData,
  ScheduleLocationErrors,
  StreamingOutlet,
} from "@/lib/events/types";

/* ── Shared input styling — same look as the Step 1 form ───────────────── */

const inputClasses = (hasError?: string) =>
  `w-full rounded-xl border bg-transparent px-3.5 py-2.5 text-sm text-foreground placeholder:text-zinc-400 focus:outline-none dark:placeholder:text-zinc-500 ${
    hasError
      ? "border-red-500 focus:border-red-500"
      : "border-border focus:border-(--main-orange) dark:border-zinc-700"
  }`;

const ERROR_TEXT_CLASSES = "mt-1.5 text-xs text-red-500";

/**
 * Step 2 — Date, Time & Location. The date/time/timezone block shows for
 * every event; the location blocks adapt to Step 1's Event Type: venue
 * fields for in-person, online details for online, both for hybrid. No
 * type picked yet → a nudge banner + the venue block as the default.
 */
export default function DateTimeLocationStep({
  data,
  eventType,
  errors,
  onChange,
}: {
  data: ScheduleLocationData;
  eventType: string;
  errors: ScheduleLocationErrors;
  onChange: (patch: Partial<ScheduleLocationData>) => void;
}) {
  // "" = Step 1 has no type yet — default the form to venue fields.
  const showVenue = eventType === "" || eventType === "in_person" || eventType === "hybrid";
  const showOnline = eventType === "online" || eventType === "hybrid";

  const [mapOpen, setMapOpen] = useState(Boolean(data.mapLocation));

  // Default the time zone to the organiser's local zone on first load
  // (setTimeout pattern — setState must not run in the effect body).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (data.timezone) return;
      try {
        onChange({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      } catch {
        // Leave unselected — the dropdown still lists every zone.
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [data.timezone, onChange]);

  const patchOutlet = (index: number, patch: Partial<StreamingOutlet>) => {
    onChange({
      outlets: data.outlets.map((outlet, i) => (i === index ? { ...outlet, ...patch } : outlet)),
    });
  };

  const addOutlet = () => {
    if (data.outlets.length >= LOCATION_LIMITS.maxOutlets) return;
    onChange({ outlets: [...data.outlets, { platform: "", link: "" }] });
  };

  const removeOutlet = (index: number) => {
    onChange({ outlets: data.outlets.filter((_, i) => i !== index) });
  };

  return (
    <section className="flex flex-col gap-10">
      {/* ── Date & Time ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Date & Time</h2>
          <p className="mt-1 text-xs text-secondary-text dark:text-zinc-500">
            When does the event run? End date/time are optional but must come
            after the start — guests see times in their own time zone.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="event-start-date" className="text-sm font-medium">
              Start Date <span className="text-(--main-orange)">*</span>
            </label>
            <input
              id="event-start-date"
              type="date"
              value={data.startDate}
              onChange={(e) => onChange({ startDate: e.target.value })}
              aria-invalid={Boolean(errors.startDate)}
              className={`${inputClasses(errors.startDate)} dark:[color-scheme:dark]`}
            />
            {errors.startDate && (
              <p data-field-error className={ERROR_TEXT_CLASSES}>
                {errors.startDate}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="event-start-time" className="text-sm font-medium">
              Start Time <span className="text-(--main-orange)">*</span>
            </label>
            <input
              id="event-start-time"
              type="time"
              value={data.startTime}
              onChange={(e) => onChange({ startTime: e.target.value })}
              aria-invalid={Boolean(errors.startTime)}
              className={`${inputClasses(errors.startTime)} dark:[color-scheme:dark]`}
            />
            {errors.startTime && (
              <p data-field-error className={ERROR_TEXT_CLASSES}>
                {errors.startTime}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="event-end-date" className="text-sm font-medium">
              End Date
            </label>
            <input
              id="event-end-date"
              type="date"
              value={data.endDate}
              onChange={(e) => onChange({ endDate: e.target.value })}
              aria-invalid={Boolean(errors.endDate)}
              className={`${inputClasses(errors.endDate)} dark:[color-scheme:dark]`}
            />
            {errors.endDate && (
              <p data-field-error className={ERROR_TEXT_CLASSES}>
                {errors.endDate}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="event-end-time" className="text-sm font-medium">
              End Time
            </label>
            <input
              id="event-end-time"
              type="time"
              value={data.endTime}
              onChange={(e) => onChange({ endTime: e.target.value })}
              aria-invalid={Boolean(errors.endTime)}
              className={`${inputClasses(errors.endTime)} dark:[color-scheme:dark]`}
            />
            {errors.endTime && (
              <p data-field-error className={ERROR_TEXT_CLASSES}>
                {errors.endTime}
              </p>
            )}
          </div>
        </div>
        <TimezoneSelect
          value={data.timezone}
          error={errors.timezone}
          onChange={(timezone) => onChange({ timezone })}
        />
      </div>

      {/* ── No type picked in Step 1 yet → nudge + venue as the default ── */}
      {eventType === "" && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
          <p>
            You haven&rsquo;t picked an <span className="font-medium">Event Type</span> in
            Step 1 yet — showing venue fields for now. Choose a type there to
            tailor this section.
          </p>
        </div>
      )}

      {/* ── Venue (in-person + hybrid) ──────────────────────────────── */}
      {showVenue && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold">Venue</h2>
            <p className="mt-1 text-xs text-secondary-text dark:text-zinc-500">
              Where is the event taking place?
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="event-venue-name" className="text-sm font-medium">
              Venue Name <span className="text-(--main-orange)">*</span>
            </label>
            <input
              id="event-venue-name"
              type="text"
              value={data.venueName}
              maxLength={LOCATION_LIMITS.venueNameMax}
              onChange={(e) => onChange({ venueName: e.target.value })}
              placeholder="e.g. Landmark Event Centre"
              aria-invalid={Boolean(errors.venueName)}
              className={inputClasses(errors.venueName)}
            />
            {errors.venueName && (
              <p data-field-error className={ERROR_TEXT_CLASSES}>
                {errors.venueName}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="event-venue-address" className="text-sm font-medium">
              Address <span className="text-(--main-orange)">*</span>
            </label>
            <input
              id="event-venue-address"
              type="text"
              value={data.venueAddress}
              maxLength={LOCATION_LIMITS.addressMax}
              onChange={(e) => onChange({ venueAddress: e.target.value })}
              placeholder="e.g. Plot 2B Water Corporation Drive"
              aria-invalid={Boolean(errors.venueAddress)}
              className={inputClasses(errors.venueAddress)}
            />
            {errors.venueAddress && (
              <p data-field-error className={ERROR_TEXT_CLASSES}>
                {errors.venueAddress}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="event-venue-city" className="text-sm font-medium">
                City <span className="text-(--main-orange)">*</span>
              </label>
              <input
                id="event-venue-city"
                type="text"
                value={data.venueCity}
                maxLength={LOCATION_LIMITS.cityMax}
                onChange={(e) => onChange({ venueCity: e.target.value })}
                placeholder="e.g. Lagos"
                aria-invalid={Boolean(errors.venueCity)}
                className={inputClasses(errors.venueCity)}
              />
              {errors.venueCity && (
                <p data-field-error className={ERROR_TEXT_CLASSES}>
                  {errors.venueCity}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="event-venue-country" className="text-sm font-medium">
                Country <span className="text-(--main-orange)">*</span>
              </label>
              <select
                id="event-venue-country"
                value={data.venueCountry}
                onChange={(e) => onChange({ venueCountry: e.target.value })}
                aria-invalid={Boolean(errors.venueCountry)}
                className={`${inputClasses(errors.venueCountry)} bg-background dark:bg-zinc-900 dark:[color-scheme:dark]`}
              >
                <option value="">Select country</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              {errors.venueCountry && (
                <p data-field-error className={ERROR_TEXT_CLASSES}>
                  {errors.venueCountry}
                </p>
              )}
            </div>
          </div>

          {/* Add map location — paste a Google Maps link or Plus Code. */}
          {!mapOpen ? (
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="self-start cursor-pointer text-sm font-medium text-(--main-orange) hover:underline"
            >
              + Add map location
            </button>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="event-map-location" className="text-sm font-medium">
                  Map location
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMapOpen(false);
                    if (data.mapLocation) onChange({ mapLocation: "" });
                  }}
                  className="cursor-pointer text-xs text-secondary-text hover:text-red-500 dark:text-zinc-400"
                >
                  Remove
                </button>
              </div>
              <input
                id="event-map-location"
                type="text"
                value={data.mapLocation}
                maxLength={LOCATION_LIMITS.mapLocationMax}
                onChange={(e) => onChange({ mapLocation: e.target.value })}
                placeholder="Paste a Google Maps link or Plus Code"
                aria-invalid={Boolean(errors.mapLocation)}
                className={inputClasses(errors.mapLocation)}
              />
              <p className="text-xs text-secondary-text dark:text-zinc-500">
                Tip: in Google Maps, tap Share → Copy link.
              </p>
              {errors.mapLocation && (
                <p data-field-error className={ERROR_TEXT_CLASSES}>
                  {errors.mapLocation}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Online details (online + hybrid) ────────────────────────── */}
      {showOnline && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold">Online details</h2>
            <p className="mt-1 text-xs text-secondary-text dark:text-zinc-500">
              Where guests join or watch the event.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="event-platform" className="text-sm font-medium">
                Platform <span className="text-(--main-orange)">*</span>
              </label>
              <select
                id="event-platform"
                value={data.platform}
                onChange={(e) => onChange({ platform: e.target.value })}
                aria-invalid={Boolean(errors.platform)}
                className={`${inputClasses(errors.platform)} bg-background dark:bg-zinc-900 dark:[color-scheme:dark]`}
              >
                <option value="">Select platform</option>
                {MEETING_PLATFORMS.map((platform) => (
                  <option key={platform.value} value={platform.value}>
                    {platform.label}
                  </option>
                ))}
              </select>
              {errors.platform && (
                <p data-field-error className={ERROR_TEXT_CLASSES}>
                  {errors.platform}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="event-meeting-id" className="text-sm font-medium">
                Meeting ID
              </label>
              <input
                id="event-meeting-id"
                type="text"
                value={data.meetingId}
                maxLength={LOCATION_LIMITS.meetingIdMax}
                onChange={(e) => onChange({ meetingId: e.target.value })}
                placeholder="Optional"
                aria-invalid={Boolean(errors.meetingId)}
                className={inputClasses(errors.meetingId)}
              />
              {errors.meetingId && (
                <p data-field-error className={ERROR_TEXT_CLASSES}>
                  {errors.meetingId}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="event-meeting-link" className="text-sm font-medium">
              Meeting / event link <span className="text-(--main-orange)">*</span>
            </label>
            <input
              id="event-meeting-link"
              type="url"
              value={data.meetingLink}
              maxLength={LOCATION_LIMITS.meetingLinkMax}
              onChange={(e) => onChange({ meetingLink: e.target.value })}
              placeholder="https://zoom.us/j/…"
              aria-invalid={Boolean(errors.meetingLink)}
              className={inputClasses(errors.meetingLink)}
            />
            {errors.meetingLink && (
              <p data-field-error className={ERROR_TEXT_CLASSES}>
                {errors.meetingLink}
              </p>
            )}
          </div>

          {/* Streaming outlets — extra places the event is broadcast. */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Streaming outlets</span>
            <p className="text-xs text-secondary-text dark:text-zinc-500">
              Also streaming on YouTube, Facebook, Meet and more? Add each
              outlet here (up to {LOCATION_LIMITS.maxOutlets}).
            </p>
            {data.outlets.map((outlet, index) => (
              <div key={index} className="flex flex-col gap-2 sm:flex-row">
                <div className="flex flex-1 flex-col gap-1.5 sm:min-w-0">
                  <label htmlFor={`outlet-platform-${index}`} className="sr-only">
                    Outlet platform
                  </label>
                  <select
                    id={`outlet-platform-${index}`}
                    value={outlet.platform}
                    onChange={(e) => patchOutlet(index, { platform: e.target.value })}
                    className={`${inputClasses()} bg-background dark:bg-zinc-900 dark:[color-scheme:dark]`}
                  >
                    <option value="">Platform</option>
                    {MEETING_PLATFORMS.map((platform) => (
                      <option key={platform.value} value={platform.value}>
                        {platform.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-[2] flex-col gap-1.5 sm:min-w-0">
                  <label htmlFor={`outlet-link-${index}`} className="sr-only">
                    Outlet link
                  </label>
                  <input
                    id={`outlet-link-${index}`}
                    type="url"
                    value={outlet.link}
                    maxLength={LOCATION_LIMITS.meetingLinkMax}
                    onChange={(e) => patchOutlet(index, { link: e.target.value })}
                    placeholder="https://… (optional)"
                    className={inputClasses()}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeOutlet(index)}
                  aria-label={`Remove outlet ${index + 1}`}
                  className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center self-start rounded-xl border border-border text-zinc-400 transition-colors hover:border-red-500 hover:text-red-500 sm:self-auto dark:border-zinc-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOutlet}
              disabled={data.outlets.length >= LOCATION_LIMITS.maxOutlets}
              className="self-start cursor-pointer rounded-lg border border-dashed border-border px-4 py-2 text-sm font-medium text-secondary-text transition-colors hover:border-zinc-400 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
            >
              + Add outlet
            </button>
            {errors.outlets && (
              <p data-field-error className={ERROR_TEXT_CLASSES}>
                {errors.outlets}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
