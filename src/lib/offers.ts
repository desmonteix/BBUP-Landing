import type { OfferRules, ResolvedPrice, PromotionExchangeRate, PromotionReference } from "@/lib/types";

export interface TicketQuote extends ResolvedPrice {
  available: boolean;
  promotionReference: PromotionReference | null;
  subtotalPen: number;
  savingsPen: number;
  appliedOffer: string | null;
}

/** Same cents-based calculation for the preview and the authoritative server charge. */
export function quoteTickets(price: ResolvedPrice, quantity: 1 | 2, rules: OfferRules = {}, now = Date.now(), promotionRate: PromotionExchangeRate | null = null): TicketQuote {
  const unitCents = Math.round(price.chargeAmountPen * 100);
  const subtotal = unitCents * quantity;
  let total = subtotal;
  let appliedOffer: string | null = null;
  let available = true;
  let promotionReference: PromotionReference | null = null;
  const active = (window: { startsAt: string; endsAt: string }) =>
    now >= Date.parse(window.startsAt) && now < Date.parse(window.endsAt);
  if (quantity === 2 && rules.promotion?.type === "two_for_one" && active(rules.promotion)) {
    total = unitCents;
    appliedOffer = "2x1";
  }
  const promotion = rules.promotion;
  if (promotion?.type === "bundle_price" && quantity === promotion.quantity && active(promotion)) {
    const rate = promotion.currency === "PEN" ? 1 : promotionRate?.currency === promotion.currency ? promotionRate.rate : null;
    if (rate == null || !Number.isFinite(rate) || rate <= 0) {
      available = false;
    } else {
      const candidate = Math.round(Math.round(promotion.amount * 100) * Math.round(rate * 1000000) / 1000000);
      if (candidate < total) {
        total = candidate;
        appliedOffer = `${promotion.quantity} entrada${promotion.quantity === 1 ? "" : "s"} por ${promotion.amount.toFixed(2)} ${promotion.currency}`;
        if (promotion.currency !== "PEN" && promotionRate) promotionReference = { ...promotionRate, amount: promotion.amount };
      }
    }
  }
  if (rules.discount && active(rules.discount)) {
    const discount = rules.discount;
    const candidate = discount.type === "percentage"
      ? Math.round(subtotal * (10000 - Math.round(discount.value * 100)) / 10000)
      : Math.max(0, subtotal - Math.round(discount.value * 100));
    // Compare both against the original subtotal; never apply one to the other.
    if (candidate < total) {
      total = candidate;
      promotionReference = null;
      appliedOffer = discount.type === "percentage" ? `${discount.value}% de descuento` : `S/ ${discount.value.toFixed(2)} de descuento`;
    }
  }
  const chargeAmountPen = total / 100;
  return {
    ...price,
    available,
    promotionReference,
    chargeAmountPen,
    displayPriceEur: price.displayPriceEur == null ? null
      : total === subtotal ? Math.round(price.displayPriceEur * quantity * 100) / 100
      : Math.round((chargeAmountPen / price.exchangeRate!) * 100) / 100,
    subtotalPen: subtotal / 100,
    savingsPen: (subtotal - total) / 100,
    appliedOffer,
  };
}
