import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { listEvents } from "@/lib/db/events";
import { getCurrentProfile } from "@/lib/auth";
import { getAccountApproval, accountApprovalMessage } from "@/lib/nationality";
import { AccountApprovalNotice } from "@/components/auth/AccountApprovalNotice";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Container } from "@/components/ui/Container";
import { EventsExplorer } from "@/components/events/EventsExplorer";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Meetups, trips, and parties for exchange students and Peruvian buddies in Lima.",
};

// Pricing is resolved per-request for the current viewer — never cache
// this page at the edge/CDN, or one viewer's resolved price could leak to
// another's cached response.
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getCurrentProfile();
  const viewerNationality = profile && getAccountApproval(profile) === "approved" ? profile.nationality : null;
  const purchaseBlockedReason = profile ? accountApprovalMessage(profile) : null;

  const [upcoming, past] = await Promise.all([
    listEvents(supabase, { when: "upcoming", viewerNationality, viewerProfileId: user?.id, purchaseBlockedReason }),
    listEvents(supabase, { when: "past", viewerNationality, viewerProfileId: user?.id, purchaseBlockedReason }),
  ]);

  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="What's on"
          title="Meetups. Trips. Parties. Always mixed."
          description="Every event below is open to exchange students and Peruvian buddies alike."
        />

        {profile && <AccountApprovalNotice profile={profile} />}
        <div className="mt-12">
          <EventsExplorer upcoming={upcoming} past={past} isLoggedIn={Boolean(user)} />
        </div>
      </Container>
    </section>
  );
}
