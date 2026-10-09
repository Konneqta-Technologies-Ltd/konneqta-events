"use client";

import { useState, type KeyboardEvent } from "react";

import { HASHTAG_LIMITS } from "@/lib/events/constants";

/** Close × on each chip. */
function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Hashtag chip input — Enter or a comma adds a tag, × removes one, and
 * Backspace on an empty input removes the last tag. Tags are normalised
 * ("#"s stripped, trimmed, lowercased), de-duplicated, and capped by
 * HASHTAG_LIMITS. Blur commits whatever is still typed.
 */
export default function TagInput({
  tags,
  error,
  onChange,
}: {
  tags: string[];
  error?: string;
  onChange: (tags: string[]) => void;
}) {
  const [value, setValue] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const atCapacity = tags.length >= HASHTAG_LIMITS.maxTags;

  /** "#Tech Conference" → "tech conference" (capped at maxLength). */
  const normalise = (raw: string) =>
    raw.replace(/#/g, "").trim().toLowerCase().slice(0, HASHTAG_LIMITS.maxLength);

  const addTag = (raw: string) => {
    const tag = normalise(raw);
    if (!tag) return;
    if (tags.includes(tag)) {
      setNotice(`"${tag}" is already added`);
      return;
    }
    if (atCapacity) {
      setNotice(`You can add up to ${HASHTAG_LIMITS.maxTags} hashtags`);
      return;
    }
    setNotice(null);
    onChange([...tags, tag]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault(); // never submit the surrounding form
      addTag(value);
      setValue("");
    } else if (event.key === "Backspace" && value === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div>
      <div
        className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 focus-within:border-(--main-orange) focus-within:outline-none ${
          error ? "border-red-500" : "border-border dark:border-zinc-700"
        }`}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-foreground dark:bg-zinc-800"
          >
            #{tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              aria-label={`Remove hashtag ${tag}`}
              className="cursor-pointer rounded-full text-zinc-400 transition-colors hover:text-red-500"
            >
              <XIcon />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setNotice(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (value.trim()) {
              addTag(value);
              setValue("");
            }
          }}
          disabled={atCapacity}
          placeholder={
            atCapacity
              ? `Max ${HASHTAG_LIMITS.maxTags} tags`
              : tags.length
                ? "Add another…"
                : "Add a hashtag and press Enter"
          }
          className="h-7 min-w-[12rem] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed dark:placeholder:text-zinc-500"
        />
      </div>
      {(error || notice) && (
        <p
          data-field-error={error ? "true" : undefined}
          className="mt-1.5 text-xs text-red-500"
        >
          {error ?? notice}
        </p>
      )}
      <p className="mt-1.5 text-xs text-secondary-text dark:text-zinc-500">
        {tags.length}/{HASHTAG_LIMITS.maxTags} hashtags
      </p>
    </div>
  );
}
