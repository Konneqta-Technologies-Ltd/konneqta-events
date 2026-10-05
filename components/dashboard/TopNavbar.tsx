"use client";

import Image from "next/image";
import Link from "next/link";

import DarkModeToggle from "@/components/DarkModeToggle";

/**
 * Dashboard top bar. Left: navigation toggle + wordmark. Right: display
 * name + avatar beside the black & white mode toggle.
 */
export default function TopNavbar({
  onMenuClick,
  displayName,
  avatarUrl,
  initial,
}: {
  onMenuClick: () => void;
  displayName: string;
  avatarUrl: string | null;
  initial: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background px-4 sm:px-6 dark:border-zinc-700">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Toggle navigation"
          className="cursor-pointer rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Link
          href="/events"
          className="truncate text-base font-semibold tracking-tight text-foreground"
        >
          Konneqta Events
        </Link>
      </div>

      {/* Display name + avatar beside the dark mode toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden max-w-40 truncate text-sm font-medium text-foreground sm:block">
          {displayName}
        </span>
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName ? `${displayName}'s avatar` : "Your avatar"}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-main-orange text-sm font-bold text-main-text"
          >
            {initial}
          </div>
        )}
        <DarkModeToggle className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800" />
      </div>
    </header>
  );
}
