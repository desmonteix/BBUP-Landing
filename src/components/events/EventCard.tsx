import Image from "next/image";
import { CalendarDays, MapPin, Users } from "lucide-react";
import type { PublicEvent } from "@/lib/types";
import { formatEventDate } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/Badge";
import { CategoryBadge } from "@/components/events/CategoryBadge";

export function EventCard({
  event,
  onOpen,
}: {
  event: PublicEvent;
  onOpen: () => void;
}) {
  const isPast = new Date(event.event_date).getTime() < Date.now();
  const isFull = event.spots_remaining === 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-md border border-border bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-pink/30 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:shadow-lg focus-visible:outline-none focus-visible:shadow-glow"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-paper-sunk">
        <Image
          src={event.cover_image ?? "/images/events/welcome-mixer.svg"}
          alt=""
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {isPast && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/50">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink">
              Past event
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={event.category} />
          {event.type === "free" ? (
            <Badge tone="success">Free</Badge>
          ) : event.resolved_price ? (
            <Badge tone="blue">
              From{" "}
              {event.resolved_price.displayPriceUsd != null
                ? formatMoney(event.resolved_price.displayPriceUsd, "USD")
                : formatMoney(event.resolved_price.chargeAmountPen, "PEN")}
            </Badge>
          ) : (
            <Badge tone="neutral">Paid</Badge>
          )}
          {isFull && !isPast && <Badge tone="error">Full</Badge>}
        </div>

        <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink transition-colors duration-200 group-hover:text-pink">
          {event.title}
        </h3>

        <div className="mt-3 space-y-1.5 text-xs text-ink/60">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} className="text-pink" />
            {formatEventDate(event.event_date)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="text-pink" />
            {event.location}
          </span>
          {event.capacity != null && (
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-pink" />
              {event.spots_remaining} of {event.capacity} spots left
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
