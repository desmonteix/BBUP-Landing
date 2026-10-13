import type { OfferRules, ResolvedPrice } from "@/lib/types";

export interface TicketQuote extends ResolvedPrice {
  subtotalPen: number;
  savingsPen: number;
  appliedOffer: string | null;
}

/** Same cents-based calculation for the preview and the authoritative server charge. */
export function quoteTickets(price: ResolvedPrice, quantity: 1 | 2, rules: OfferRules = {}, now = Date.now()): TicketQuote {
  const unitCents = Math.round(price.chargeAmountPen * 100);
  const subtotal = unitCents * quantity;
  let total = subtotal;
  let appliedOffer: string | null = null;
  const active = (window: { startsAt: string; endsAt: string }) =>
    now >= Date.parse(window.startsAt) && now < Date.parse(window.endsAt);
  if (quantity === 2 && rules.promotion?.type === "two_for_one" && active(rules.promotion)) {
    total = unitCents;
    appliedOffer = "2x1";
  }
  if (rules.discount && active(rules.discount)) {
    const discount = rules.discount;
    const candidate = discount.type === "percentage"
      ? Math.round(subtotal * (10000 - Math.round(discount.value * 100)) / 10000)
      : Math.max(0, subtotal - Math.round(discount.value * 100));
    // Compare both against the original subtotal; never apply one to the other.
    if (candidate < total) {
      total = candidate;
      appliedOffer = discount.type === "percentage" ? `${discount.value}% de descuento` : `S/ ${discount.value.toFixed(2)} de descuento`;
    }
  }
  const chargeAmountPen = total / 100;
  return {
    ...price,
    chargeAmountPen,
    displayPriceUsd: price.displayPriceUsd == null ? null
      : total === subtotal ? Math.round(price.displayPriceUsd * quantity * 100) / 100
      : Math.round((chargeAmountPen / price.exchangeRate!) * 100) / 100,
    subtotalPen: subtotal / 100,
    savingsPen: (subtotal - total) / 100,
    appliedOffer,
  };
}
