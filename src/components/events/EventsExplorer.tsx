"use client";

import { useState } from "react";
import type { PublicEvent } from "@/lib/types";
import { EventCard } from "@/components/events/EventCard";
import { PastEventCard } from "@/components/events/PastEventCard";
import { EventModal } from "@/components/events/EventModal";
import { Reveal } from "@/components/ui/Reveal";
import { staggerDelay } from "@/lib/utils";
import { PAST_EVENTS_SHOWCASE } from "@/lib/content";

export function EventsExplorer({
  upcoming,
  past,
  isLoggedIn,
}: {
  upcoming: PublicEvent[];
  /** Real closed events from the DB — merged with the always-on static
   * PAST_EVENTS_SHOWCASE below, not a replacement for it. */
  past: PublicEvent[];
  isLoggedIn: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = upcoming.find((e) => e.id === selectedId) ?? null;
  const pastShowcase = [...PAST_EVENTS_SHOWCASE, ...past];

  return (
    <>
      {upcoming.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-paper-sunk p-12 text-center">
          <p className="font-display text-lg font-semibold text-ink">
            Nothing on the calendar right now
          </p>
          <p className="mt-2 text-sm text-ink/60">
            Join the newsletter and we&rsquo;ll email you the moment the next
            event is up.
          </p>
        </div>
      ) : (
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">
            Book your spot
          </h2>
          <p className="mt-1 text-sm text-ink/60">
            Upcoming events — reserve a free spot or grab a ticket, right on this page.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event, i) => (
              <Reveal key={event.id} delay={staggerDelay(i)}>
                <EventCard event={event} onOpen={() => setSelectedId(event.id)} />
              </Reveal>
            ))}
          </div>
        </div>
      )}

      {pastShowcase.length > 0 && (
        <div className="mt-16">
          <h2 className="font-display text-lg font-semibold text-ink">
            The fun so far
          </h2>
          <p className="mt-1 text-sm text-ink/60">
            A look back at what being part of Best Buddy UP! actually looks like.
          </p>
          <div className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
            {pastShowcase.map((event, i) => (
              <Reveal key={event.id} delay={staggerDelay(i)}>
                <PastEventCard event={event} />
              </Reveal>
            ))}
          </div>
        </div>
      )}

      <EventModal event={selected} isLoggedIn={isLoggedIn} onClose={() => setSelectedId(null)} />
    </>
  );
}
