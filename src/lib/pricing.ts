import "server-only";
import type { Nationality, ResolvedPrice } from "@/lib/types";

export { formatMoney } from "@/lib/money";

/**
 * Nationality-gated pricing (spec §5, §8, reworked for Mercado Pago in
 * §3/§4/§10). This is the ONLY place the PEN-charge decision is made.
 * Server-only by construction (imports "server-only", so bundling this
 * into a Client Component fails the build).
 *
 * Mercado Pago's Peru Checkout Pro can only ever charge in PEN — even for
 * international cards (the card network/issuing bank converts on the
 * buyer's side, same as Airbnb/Netflix, but the amount MP itself processes
 * is always soles). So every buyer's `chargeAmountPen` is a real PEN
 * amount:
 *   - Peruvian buyers: `events.price_pen`, charged as-is, no conversion.
 *   - Everyone else: `events.price_usd` converted to PEN at the current
 *     `exchange_rates.rate` (passed in by the caller — see
 *     src/lib/exchangeRate.ts), rounded to 2 decimals. The USD figure and
 *     the rate used are carried along ONLY so the UI/receipt can show
 *     "$30 ≈ S/ 112.50" — never as something that gets charged directly.
 *
 * Hard rule: callers must take the returned `ResolvedPrice` and must never
 * also forward the source event's `price_pen`/`price_usd` fields to the
 * client alongside it.
 *
 * Returns null when pricing can't be safely resolved: missing source
 * prices, or (for non-Peruvian buyers) no exchange rate available yet —
 * better to block checkout than guess a conversion.
 */
export function resolvePriceForNationality(
  nationality: Nationality | string,
  event: { price_pen: number | null; price_usd: number | null },
  currentExchangeRate: number | null
): ResolvedPrice | null {
  if (event.price_pen == null || event.price_usd == null) return null;

  if (nationality === "Peruvian") {
    return {
      chargeAmountPen: event.price_pen,
      displayPriceUsd: null,
      exchangeRate: null,
    };
  }

  if (currentExchangeRate == null) return null;

  const chargeAmountPen = Math.round(event.price_usd * currentExchangeRate * 100) / 100;

  return {
    chargeAmountPen,
    displayPriceUsd: event.price_usd,
    exchangeRate: currentExchangeRate,
  };
}
