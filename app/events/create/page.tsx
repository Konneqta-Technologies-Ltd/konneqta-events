import type { Metadata } from "next";
import { redirect } from "next/navigation";

import BecomeOrganizer from "@/components/dashboard/BecomeOrganizer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Create event | Konneqta Events",
};

/**
 * /events/create — organizer gate for the wizard. Organizers go straight
 * to step 1; attendees get the one-click "Become an organizer" prompt
 * (the events insert policy enforces the role server-side too).
 */
export default async function CreateEventPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/create");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "organizer") {
    return <BecomeOrganizer next="/events/create/1" />;
  }

  redirect("/events/create/1");
}

