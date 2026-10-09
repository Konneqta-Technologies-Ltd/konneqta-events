import Link from "next/link";

import DarkModeToggle from "@/components/DarkModeToggle";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header — Login button + black & white mode toggle at the top right */}
      <header className="flex items-center justify-end gap-2 px-6 py-4">
        <Link
          href="/create"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Login
        </Link>
        <DarkModeToggle className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800" />
      </header>

      {/* Hero — what Konneqta Events is + two centered CTAs */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Discover, share, and host events
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-secondary-text dark:text-zinc-400">
          Konneqta Events is a simple event management application — an
          extension of Konneqta, the platform for digital business card
          generation. Tour events happening around you, or create your own in
          just a few taps.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/tour"
            className="rounded-lg bg-main-orange px-6 py-3 text-base font-medium text-main-text transition-opacity hover:opacity-90"
          >
            Tour events
          </Link>
          <Link
            href="/create"
            className="rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Create events
          </Link>
        </div>
      </main>
    </div>
  );
}
