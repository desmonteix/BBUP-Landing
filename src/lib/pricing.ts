import "server-only";
import type { ExchangeRate, Nationality, ResolvedPrice } from "@/lib/types";

export { formatMoney } from "@/lib/money";

/**
 * Margin added on top of the official BCRP rate before converting a USD
 * price to the soles actually charged. Absolute, in soles per US$: a BCRP
 * rate of 3.500 charges at 3.600.
 *
 * It covers the spread between BCRP's reference rate and what the
 * organization really nets once Mercado Pago's fee and intraday rate
 * movement are accounted for. It is deliberately NOT applied to manual
 * overrides — see `effectiveRateFor`.
 */
export const BCRP_RATE_MARKUP = 0.1;

/**
 * The rate that is both charged and shown to the buyer.
 *
 * Only automatic BCRP rates get the markup. A `manual_override` is a number
 * an organizer typed into the admin panel during an outage, and it is taken
 * as the final rate — silently adding 0.1 to it would mean the panel showed
 * one number while checkout used another.
 *
 * Both branches round to 3 decimals — the precision the admin input and every
 * display already use. The BCRP branch needs it because 3.5 + 0.1 is
 * 3.6000000000000005 in IEEE-754. The manual branch needs it because
 * `exchange_rates.rate` is numeric(10,4): `setManualExchangeRate` normalizes
 * what it writes, but a row written before that existed, or by anything else,
 * can still carry a 4th decimal. Rounding here rather than trusting the writer
 * is what keeps the persisted `exchange_rate_applied` equal to the rate the
 * charge was actually derived from — otherwise a receipt cannot be reconciled
 * against the amount on the card.
 */
export function effectiveRateFor(currentExchangeRate: ExchangeRate): number {
  const base =
    currentExchangeRate.source === "bcrp_auto"
      ? currentExchangeRate.rate + BCRP_RATE_MARKUP
      : currentExchangeRate.rate;
  return Math.round(base * 1000) / 1000;
}

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
 *   - Peruvian buyers: `events.price_pen`, charged as-is. No conversion
 *     happens, so the markup never touches them.
 *   - Everyone else: `events.price_usd` converted to PEN at the effective
 *     rate (see `effectiveRateFor`), rounded to 2 decimals. The USD figure
 *     and the rate used are carried along ONLY so the UI/receipt can show
 *     "$30 ≈ S/ 108.00" — never as something that gets charged directly.
 *
 * Takes the whole `ExchangeRate` row rather than a bare number because the
 * markup depends on where the rate came from; passing `.rate` alone would
 * silently drop that distinction.
 *
 * `exchangeRate` in the result is always the rate actually applied, never
 * the raw BCRP figure — TicketForm shows it next to `chargeAmountPen`, so
 * `displayPriceUsd * exchangeRate` has to equal what the card is charged or
 * the buyer sees arithmetic that does not add up.
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
  currentExchangeRate: ExchangeRate | null
): ResolvedPrice | null {
  if (event.price_pen == null || event.price_usd == null) return null;

  if (nationality === "Peruvian") {
    return {
      chargeAmountPen: event.price_pen,
      displayPriceUsd: null,
      exchangeRate: null,
      includesMargin: false,
    };
  }

  if (currentExchangeRate == null) return null;

  const appliedRate = effectiveRateFor(currentExchangeRate);

  // Multiply as integers, not floats. `Math.round(usd * rate * 100) / 100`
  // loses a cent whenever the exact product lands on a half-cent that IEEE-754
  // stores a hair below the boundary (the Math.round(2.675 * 100) / 100 === 2.67
  // problem): $1.15 at 1.100 is exactly S/ 1.265 but rounds down to S/ 1.26.
  // Cents x thousandths is an exact integer product, so the only rounding left
  // is the deliberate one, half-up, to the nearest cent.
  const usdCents = Math.round(event.price_usd * 100);
  const rateMilli = Math.round(appliedRate * 1000);
  const chargeAmountPen = Math.round((usdCents * rateMilli) / 1000) / 100;

  return {
    chargeAmountPen,
    displayPriceUsd: event.price_usd,
    exchangeRate: appliedRate,
    includesMargin: currentExchangeRate.source === "bcrp_auto",
  };
}
