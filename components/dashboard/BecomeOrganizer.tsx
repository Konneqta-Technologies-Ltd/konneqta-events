"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import Spinner from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase/client";

/**
 * One-click role upgrade — attendees who tap "Create events" land here.
 * Flipping profiles.role to "organizer" unlocks the wizard (the events
 * insert policy checks the role as a backstop) and the sidenav gains
 * "My Events" after the refresh.
 */
export default function BecomeOrganizer({ next = "/events/create/1" }: { next?: string }) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const handleSwitch = async () => {
    if (switching) return;
    setSwitching(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in first");
        setSwitching(false);
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({ role: "organizer" })
        .eq("id", user.id);
      if (error) {
        toast.error(`Could not switch: ${error.message}`);
        setSwitching(false);
        return;
      }
      toast.success("You're an organizer now — let's create your first event");
      router.push(next);
      router.refresh();
    } catch {
      toast.error("Something went wrong — please try again");
      setSwitching(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center rounded-2xl border border-border px-6 py-12 text-center dark:border-zinc-700">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7 text-(--main-orange)"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 2v4" />
          <path d="m16.2 7.8 2.9-2.9" />
          <path d="M18 12h4" />
          <path d="m16.2 16.2 2.9 2.9" />
          <path d="M12 18v4" />
          <path d="m4.9 19.1 2.9-2.9" />
          <path d="M2 12h4" />
          <path d="m4.9 4.9 2.9 2.9" />
        </svg>
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">Become an organizer</h1>
      <p className="mt-2 text-sm leading-6 text-secondary-text dark:text-zinc-400">
        Creating events is for organizer accounts. Your existing registrations
        stay exactly as they are — you&apos;ll also get the My Events dashboard
        for managing your own events.
      </p>
      <button
        type="button"
        onClick={handleSwitch}
        disabled={switching}
        className="mt-6 flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-main-orange px-6 py-3 text-sm font-semibold text-main-text transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {switching && <Spinner size="sm" className="text-white" />}
        {switching ? "Switching…" : "Switch to organizer"}
      </button>
      <Link
        href="/events/registrations"
        className="mt-4 cursor-pointer text-sm font-medium text-secondary-text transition-colors hover:text-foreground dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        Not now — back to my registrations
      </Link>
    </div>
  );
}
