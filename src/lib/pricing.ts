import "server-only";
import type { Nationality, ResolvedPrice } from "@/lib/types";

/**
 * Nationality-gated pricing (spec §5, §8). This is the ONLY place the
 * PEN/USD split decision is made. Server-only by construction (imports
 * "server-only", so bundling this into a Client Component fails the build).
 *
 * Hard rule: callers must take the returned `ResolvedPrice` — a single
 * amount/currency pair — and must never also forward the source event's
 * `price_pen`/`price_usd` fields to the client alongside it.
 */
export function resolvePriceForNationality(
  nationality: Nationality | string,
  event: { price_pen: number | null; price_usd: number | null }
): ResolvedPrice | null {
  if (event.price_pen == null || event.price_usd == null) return null;

  if (nationality === "Peruvian") {
    return { amount: event.price_pen, currency: "PEN" };
  }

  return { amount: event.price_usd, currency: "USD" };
}

/** Culqi expects integer amounts in the currency's smallest unit (cents). */
export function toCulqiAmount(amount: number): number {
  return Math.round(amount * 100);
}

export function formatMoney(amount: number, currency: "PEN" | "USD"): string {
  const symbol = currency === "PEN" ? "S/" : "$";
  return `${symbol} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
