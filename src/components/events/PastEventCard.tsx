import Image from "next/image";

export interface PastEventCardData {
  id: string;
  title: string;
  cover_image: string | null;
}

/**
 * Past events are a highlight reel, not a booking flow — no modal, no
 * click target, just the photo and the name. Deliberately simpler than
 * EventCard (no badges/date/location/capacity): the point is showing the
 * fun, not repeating logistics for something you can no longer attend.
 *
 * Takes a narrow shape (not the full `PublicEvent`) because past events
 * shown here are a mix of static showcase content (content.ts — not real
 * Supabase rows, see PAST_EVENTS_SHOWCASE) and real closed events from the
 * DB once the org has actually run some.
 */
export function PastEventCard({ event }: { event: PastEventCardData }) {
  return (
    <figure className="group relative aspect-[4/5] overflow-hidden rounded-md bg-paper-sunk shadow-sm">
      <Image
        src={event.cover_image ?? "/images/events/welcome-mixer.svg"}
        alt=""
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 from-0% via-ink/10 via-45% to-transparent"
      />
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
        <span className="font-display text-base font-semibold text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.4)] sm:text-lg">
          {event.title}
        </span>
      </figcaption>
    </figure>
  );
}
