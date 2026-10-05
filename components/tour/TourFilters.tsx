"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { EVENT_CATEGORIES, EVENT_TYPES } from "@/lib/events/constants";

/** Shared select styling. */
const SELECT_CLASSES =
  "cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-(--main-orange) focus:outline-none dark:border-zinc-700 dark:bg-zinc-900";

/**
 * Tour filter bar — text search, category, event type, city and a
 * when-window. URL-driven: every change rewrites the /tour search params
 * (which resets pagination) so filtered views are shareable and the server
 * component does the filtering.
 */
export default function TourFilters({ cities }: { cities: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const category = searchParams.get("category") ?? "";
  const type = searchParams.get("type") ?? "";
  const city = searchParams.get("city") ?? "";
  const when = searchParams.get("when") ?? "upcoming";
  const hasFilters = Boolean(q || category || type || city || when !== "upcoming");

  /** Push a param patch — empty values drop the key; page resets to 1. */
  const apply = (patch: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    router.push(`/tour${params.size > 0 ? `?${params.toString()}` : ""}`);
  };

  return (
    <form
      className="mt-6 flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        apply({ q: q.trim() });
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Text search — Enter applies. */}
        <div className="relative flex-1">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events by name or theme…"
            aria-label="Search events"
            className="w-full rounded-lg border border-border bg-background py-2 pl-3 pr-4 text-sm text-foreground focus:border-(--main-orange) focus:outline-none dark:border-zinc-700"
          />
        </div>

        <select
          value={when}
          onChange={(e) => apply({ when: e.target.value })}
          aria-label="When"
          className={SELECT_CLASSES}
        >
          <option value="upcoming">Happening &amp; upcoming</option>
          <option value="past">Past events</option>
          <option value="all">Any time</option>
        </select>

        <select
          value={category}
          onChange={(e) => apply({ category: e.target.value })}
          aria-label="Category"
          className={SELECT_CLASSES}
        >
          <option value="">All categories</option>
          {EVENT_CATEGORIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={type}
          onChange={(e) => apply({ type: e.target.value })}
          aria-label="Event type"
          className={SELECT_CLASSES}
        >
          <option value="">All types</option>
          {EVENT_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={city}
          onChange={(e) => apply({ city: e.target.value })}
          aria-label="City"
          className={SELECT_CLASSES}
          disabled={cities.length === 0}
        >
          <option value="">All cities</option>
          {cities.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            router.push("/tour");
          }}
          className="self-start cursor-pointer text-sm font-medium text-(--main-orange) hover:underline"
        >
          Clear all filters
        </button>
      )}
    </form>
  );
}
