import type { Metadata } from "next";
import Link from "next/link";

import AuthPanel from "@/components/AuthPanel";
import DarkModeToggle from "@/components/DarkModeToggle";

export const metadata: Metadata = {
  title: "Create events | Konneqta Events",
};

/** Only site-relative paths may ride along in ?next= (blocks open redirects). */
function safeNext(raw: string | undefined): string | undefined {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : undefined;
}

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header — back link + black & white mode toggle at the top right */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Back to home
        </Link>
        <DarkModeToggle className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800" />
      </header>

      {/* Auth lives inline on this page — the AuthPanel card switches
          between Login and Sign up in place (no separate auth pages). Once
          signed in, it flips into a signed-in view and redirects to the
          dashboard (or back to ?next=, e.g. an event's registration). */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Create events</h1>
        <p className="mt-3 max-w-md text-center text-lg leading-8 text-secondary-text dark:text-zinc-400">
          Sign in or create an account to set up and share your own events in
          minutes.
        </p>
        <div className="mt-8 w-full max-w-md">
          <AuthPanel redirectTo={safeNext(next)} />
        </div>
      </main>
    </div>
  );
}
