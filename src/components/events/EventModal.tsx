"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, MapPin, Users, X } from "lucide-react";
import type { PublicEvent } from "@/lib/types";
import { formatEventDate, formatEventTime } from "@/lib/utils";
import { CategoryBadge } from "@/components/events/CategoryBadge";
import { Badge } from "@/components/ui/Badge";
import { RsvpForm } from "@/components/events/RsvpForm";
import { TicketForm } from "@/components/events/TicketForm";

export function EventModal({
  event,
  isLoggedIn,
  onClose,
}: {
  event: PublicEvent | null;
  isLoggedIn: boolean;
  onClose: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!event) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [event, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {event && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-modal-title"
            onClick={(e) => e.stopPropagation()}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.97 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-lg bg-white shadow-lg sm:rounded-lg"
          >
            <div className="relative aspect-[16/9]">
              <Image
                src={event.cover_image ?? "/images/events/welcome-mixer.svg"}
                alt=""
                fill
                sizes="(min-width: 640px) 42rem, 100vw"
                className="object-cover sm:rounded-t-lg"
                priority
              />
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close event details"
                className="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/90 text-ink shadow-md transition-transform duration-200 hover:scale-105"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={event.category} />
                {event.type === "free" && <Badge tone="success">Free</Badge>}
              </div>

              <h2
                id="event-modal-title"
                className="mt-3 font-display text-2xl font-semibold text-ink sm:text-3xl"
              >
                {event.title}
              </h2>

              <div className="mt-4 flex flex-col gap-2 text-sm text-ink/65 sm:flex-row sm:flex-wrap sm:gap-5">
                <span className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-pink" />
                  {formatEventDate(event.event_date)} · {formatEventTime(event.event_date)}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin size={16} className="text-pink" />
                  {event.location}
                </span>
                {event.capacity != null && (
                  <span className="flex items-center gap-2">
                    <Users size={16} className="text-pink" />
                    {event.spots_remaining} of {event.capacity} spots left
                  </span>
                )}
              </div>

              <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-ink/75">
                {event.description}
              </p>

              {(event.promotions || event.discounts) && (
                <div className="mt-5 space-y-3 rounded-md bg-paper-sunk p-4">
                  {event.promotions && <div><h3 className="text-sm font-semibold">Promociones</h3><p className="whitespace-pre-line text-sm text-ink/75">{event.promotions}</p></div>}
                  {event.discounts && <div><h3 className="text-sm font-semibold">Descuentos</h3><p className="whitespace-pre-line text-sm text-ink/75">{event.discounts}</p></div>}
                </div>
              )}

              <div className="mt-7 border-t border-border pt-6">
                {event.status === "closed" ? (
                  <p className="rounded-md bg-paper-sunk p-4 text-center text-sm font-medium text-ink/60">
                    Registration is closed for this event.
                  </p>
                ) : event.spots_remaining === 0 ? (
                  <p className="rounded-md bg-paper-sunk p-4 text-center text-sm font-medium text-ink/60">
                    This event is full — check back for the next one.
                  </p>
                ) : event.type === "free" ? (
                  <RsvpForm eventId={event.id} />
                ) : (
                  <TicketForm
                    key={`${event.id}:${event.terms_version}`}
                    eventId={event.id}
                    allowCompanion={event.allow_companion}
                    spotsRemaining={event.spots_remaining}
                    isLoggedIn={isLoggedIn}
                    resolvedPrice={event.resolved_price}
                    purchaseBlockedReason={event.purchase_blocked_reason}
                    offerRules={event.offer_rules}
                    promotionExchangeRate={event.promotion_exchange_rate}
                    termsText={event.terms_text}
                    termsUrl={event.terms_url}
                    termsVersion={event.terms_version}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
