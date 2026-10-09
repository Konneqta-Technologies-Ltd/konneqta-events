import { redirect } from "next/navigation";

import DashboardShell from "@/components/dashboard/DashboardShell";
import { createClient } from "@/lib/supabase/server";
import { getUserDisplay } from "@/lib/user-display";

/**
 * Dashboard layout for /events (and future dashboard routes). Requires a
 * session — signed-out visitors are sent to /create to sign in, where the
 * inline AuthPanel lives.
 */
export default async function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fresh clone before .env.local is filled in — treat as signed out so
  // the build stays green without Supabase configured.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) redirect("/create");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/create");

  const { displayName, avatarUrl, initial } = getUserDisplay(user);

  // Role drives the dashboard: organizers manage events, attendees see
  // their registrations. Defaults to attendee (Google signups, legacy rows).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role === "organizer" ? "organizer" : "attendee";

  return (
    <DashboardShell
      displayName={displayName}
      avatarUrl={avatarUrl}
      initial={initial}
      role={role}
    >
      {children}
    </DashboardShell>
  );
}
