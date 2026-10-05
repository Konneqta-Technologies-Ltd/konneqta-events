import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import CreateEventWizard from "@/components/events/create/CreateEventWizard";
import { TOTAL_STEPS } from "@/lib/events/constants";
import { draftFromRow, type EventRow, type TicketRow } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Create event | Konneqta Events",
};

/**
 * One URL per wizard step — /events/create/1 … /6. Sitting under
 * app/events means the dashboard layout guarantees a signed-in owner.
 * With ?id=<event uuid> the saved draft is loaded (resume / edit);
 * without it, any step past 1 starts the flow fresh at the beginning.
 * The resume query is scoped to this user's own rows — another
 * organizer's event id resolves to a 404 here.
 */
export default async function CreateEventStepPage({
  params,
  searchParams,
}: {
  params: Promise<{ step: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const { step } = await params;
  const { id } = await searchParams;

  const stepNumber = Number(step);
  if (!Number.isInteger(stepNumber) || stepNumber < 1 || stepNumber > TOTAL_STEPS) {
    notFound();
  }

  // Nothing to resume — the flow always begins at Step 1.
  if (!id && stepNumber > 1) redirect("/events/create/1");

  const supabase = await createClient();

  // The dashboard layout guarantees a session — this fetch supplies the
  // owner id the wizard uses for storage paths and owner_id, so saves
  // never depend on a client-side auth round-trip.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/create");

  // Organizer gate — attendees are bounced to the upgrade prompt.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "organizer") redirect("/events/create");

  let draft = null;
  if (id) {
    // RLS scopes the select to the signed-in owner's rows, and the owner_id
    // filter makes it explicit: never resume someone else's event.
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!data) notFound();
    // Step 4 ticket types live in their own table — loaded alongside the
    // draft so the wizard resumes exactly what was saved.
    const { data: ticketData } = await supabase
      .from("event_tickets")
      .select("*")
      .eq("event_id", id)
      .order("sort_order", { ascending: true });
    draft = draftFromRow(data as EventRow, (ticketData as TicketRow[] | null) ?? []);
  }

  return <CreateEventWizard step={stepNumber} draft={draft} ownerId={user.id} />;
}

