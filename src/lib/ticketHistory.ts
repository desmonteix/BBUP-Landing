import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Pending reservations consume the personal entry too; failed attempts do not. */
export async function getEventsWithTickets(profileId: string, eventIds: string[]): Promise<Set<string> | null> {
  if (!eventIds.length) return new Set();
  const { data, error } = await createAdminClient().from("registrations")
    .select("event_id")
    .eq("profile_id", profileId)
    .eq("kind", "ticket")
    .in("event_id", eventIds)
    .in("payment_status", ["pending", "paid"]);
  if (error) {
    console.error("[ticketHistory] could not load prior tickets", error);
    return null;
  }
  return new Set((data ?? []).map((row) => row.event_id as string));
}
