"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PublicEvent } from "@/lib/types";
import { EventCard } from "@/components/events/EventCard";
import { EventModal } from "@/components/events/EventModal";
import { Reveal } from "@/components/ui/Reveal";
import { staggerDelay } from "@/lib/utils";

export function EventsExplorer({
  upcoming,
  past,
  isLoggedIn,
}: {
  upcoming: PublicEvent[];
  past: PublicEvent[];
  isLoggedIn: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pastOpen, setPastOpen] = useState(false);

  const all = [...upcoming, ...past];
  const selected = all.find((e) => e.id === selectedId) ?? null;

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

      {past.length > 0 && (
        <div className="mt-16">
          <button
            type="button"
            onClick={() => setPastOpen((v) => !v)}
            className="flex cursor-pointer items-center gap-2 font-display text-lg font-semibold text-ink transition-colors duration-200 hover:text-pink"
            aria-expanded={pastOpen}
          >
            <ChevronDown
              size={20}
              className={`transition-transform duration-200 ${pastOpen ? "rotate-180" : ""}`}
            />
            Past events ({past.length})
          </button>

          {pastOpen && (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((event, i) => (
                <Reveal key={event.id} delay={staggerDelay(i)}>
                  <EventCard event={event} onOpen={() => setSelectedId(event.id)} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      )}

      <EventModal event={selected} isLoggedIn={isLoggedIn} onClose={() => setSelectedId(null)} />
    </>
  );
}
