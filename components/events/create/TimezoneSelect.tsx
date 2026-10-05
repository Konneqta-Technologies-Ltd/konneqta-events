"use client";

import { useMemo } from "react";

/** Used when Intl.supportedValuesOf is unavailable (very old browsers). */
const FALLBACK_ZONES = [
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/Chicago",
  "America/Los_Angeles",
  "America/New_York",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
  "UTC",
];

/** "Africa/Lagos" → "Lagos (GMT+1)" — offset from the browser's own Intl. */
function zoneLabel(zone: string): string {
  try {
    const offset = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;
    const city = zone.split("/").pop()?.replaceAll("_", " ") ?? zone;
    return offset ? `${city} (${offset})` : city;
  } catch {
    return zone.replace(/_/g, " ");
  }
}

/**
 * Time zone dropdown built from the browser's Intl database (no bundled
 * list), shown as "Lagos (GMT+1)" and sorted alphabetically so zones are
 * easy to find.
 */
export default function TimezoneSelect({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (timezone: string) => void;
}) {
  const options = useMemo(() => {
    let zones: string[];
    try {
      zones = Intl.supportedValuesOf("timeZone");
    } catch {
      zones = FALLBACK_ZONES;
    }
    if (!zones.length) zones = FALLBACK_ZONES;
    return zones
      .map((zone) => ({ zone, label: zoneLabel(zone) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="event-timezone" className="text-sm font-medium">
        Time Zone <span className="text-(--main-orange)">*</span>
      </label>
      <select
        id="event-timezone"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none dark:bg-zinc-900 dark:[color-scheme:dark] ${
          error
            ? "border-red-500 focus:border-red-500"
            : "border-border focus:border-(--main-orange) dark:border-zinc-700"
        }`}
      >
        <option value="">Select time zone</option>
        {options.map(({ zone, label }) => (
          <option key={zone} value={zone}>
            {label}
          </option>
        ))}
      </select>
      {error && (
        <p data-field-error className="mt-1.5 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
