import { describe, it, expect } from "vitest";
import { resolvePriceForNationality, BCRP_RATE_MARKUP } from "@/lib/pricing";
import type { ExchangeRate, ExchangeRateSource } from "@/lib/types";

function rate(value: number, source: ExchangeRateSource): ExchangeRate {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    rate: value,
    source,
    updated_at: "2026-10-08T00:00:00.000Z",
  };
}

const paidEvent = { price_pen: 90, price_usd: 30 };

describe("resolvePriceForNationality", () => {
  describe("Peruvian buyers", () => {
    it("charges price_pen untouched, with no conversion metadata", () => {
      const result = resolvePriceForNationality("Peruvian", paidEvent, rate(3.5, "bcrp_auto"));

      expect(result).toEqual({
        chargeAmountPen: 90,
        displayPriceUsd: null,
        exchangeRate: null,
        includesMargin: false,
      });
    });

    it("never has the markup applied to it", () => {
      const withRate = resolvePriceForNationality("Peruvian", paidEvent, rate(3.5, "bcrp_auto"));
      const withoutRate = resolvePriceForNationality("Peruvian", paidEvent, null);

      expect(withRate?.chargeAmountPen).toBe(90);
      expect(withoutRate?.chargeAmountPen).toBe(90);
    });

    it("prices normally even when no exchange rate exists at all", () => {
      expect(resolvePriceForNationality("Peruvian", paidEvent, null)).not.toBeNull();
    });
  });

  describe("non-Peruvian buyers on an automatic BCRP rate", () => {
    it("adds the markup to the BCRP rate before converting", () => {
      const result = resolvePriceForNationality("German", paidEvent, rate(3.5, "bcrp_auto"));

      // BCRP 3.5 + 0.1 margin = 3.6 charged; 30 USD * 3.6 = S/ 108.00
      expect(result?.exchangeRate).toBe(3.6);
      expect(result?.chargeAmountPen).toBe(108);
      expect(result?.displayPriceUsd).toBe(30);
    });

    it("reports the same rate it charged, so the buyer's arithmetic reconciles", () => {
      const result = resolvePriceForNationality("German", paidEvent, rate(3.5, "bcrp_auto"));

      // The buyer is shown `exchangeRate` and `chargeAmountPen` side by side
      // (TicketForm). price_usd * shown rate must equal the charged amount,
      // or the displayed conversion looks like it is hiding a fee.
      expect(result!.displayPriceUsd! * result!.exchangeRate!).toBeCloseTo(
        result!.chargeAmountPen,
        10
      );
    });

    it("does not leak binary floating-point noise into the stored rate", () => {
      // 3.5 + 0.1 === 3.6000000000000005 in IEEE-754. That value gets
      // persisted as `exchange_rate_applied` and rendered with toFixed(3),
      // so it must be rounded at the source.
      const result = resolvePriceForNationality("German", paidEvent, rate(3.5, "bcrp_auto"));
      expect(result!.exchangeRate!.toString()).toBe("3.6");

      const awkward = resolvePriceForNationality("German", paidEvent, rate(3.333, "bcrp_auto"));
      expect(awkward!.exchangeRate!.toString()).toBe("3.433");
    });

    it("rounds the charged amount to two decimals", () => {
      const result = resolvePriceForNationality(
        "French",
        { price_pen: 90, price_usd: 29.99 },
        rate(3.777, "bcrp_auto")
      );

      // 29.99 * 3.877 = 116.270... -> 116.27
      expect(result?.exchangeRate).toBe(3.877);
      expect(result?.chargeAmountPen).toBe(116.27);
    });

    it("rounds half-cent boundaries up instead of losing a cent to float error", () => {
      // `Math.round(usd * rate * 100) / 100` silently loses a cent whenever the
      // exact product lands on a half-cent that IEEE-754 represents just below
      // the boundary — the same class of bug as Math.round(2.675 * 100) / 100
      // returning 2.67. Every occurrence undercharges, so it leaks revenue
      // rather than overcharging a buyer, which is why it went unnoticed.
      const result = resolvePriceForNationality(
        "German",
        { price_pen: 5, price_usd: 1.15 },
        rate(1, "bcrp_auto")
      );

      // 1.15 USD at 1.100 = exactly S/ 1.265 -> half-up -> S/ 1.27
      expect(result?.exchangeRate).toBe(1.1);
      expect(result?.chargeAmountPen).toBe(1.27);
    });

    it("stays exact across a sweep of prices and rates", () => {
      // Guards the whole conversion against float drift rather than the single
      // case above: compares every result to integer arithmetic on cents.
      for (let usdCents = 100; usdCents <= 20000; usdCents += 37) {
        for (let rateMilli = 3000; rateMilli <= 4500; rateMilli += 131) {
          const priceUsd = usdCents / 100;
          const baseRate = (rateMilli - 100) / 1000;
          const result = resolvePriceForNationality(
            "German",
            { price_pen: 1, price_usd: priceUsd },
            rate(baseRate, "bcrp_auto")
          );

          // Oracle built from quotient and remainder rather than Math.round,
          // so it shares no arithmetic with the code under test: it states the
          // half-up rule outright instead of delegating it.
          const product = usdCents * rateMilli; // exact: integer * integer
          const quotient = Math.floor(product / 1000);
          const remainder = product - quotient * 1000;
          const expectedCents = remainder >= 500 ? quotient + 1 : quotient;

          expect(result?.chargeAmountPen).toBe(expectedCents / 100);
        }
      }
    });

    it("uses the documented markup constant rather than a hardcoded number", () => {
      const base = 4;
      const result = resolvePriceForNationality("German", paidEvent, rate(base, "bcrp_auto"));
      expect(result?.exchangeRate).toBe(base + BCRP_RATE_MARKUP);
    });
  });

  describe("non-Peruvian buyers on a manual override", () => {
    it("charges the manual rate exactly, with no markup added", () => {
      const result = resolvePriceForNationality("German", paidEvent, rate(3.9, "manual_override"));

      // The organizer typed 3.9 meaning 3.9 — it is the final rate.
      expect(result?.exchangeRate).toBe(3.9);
      expect(result?.chargeAmountPen).toBe(117);
    });

    it("normalizes a rate stored with more precision than any display shows", () => {
      // `exchange_rates.rate` is numeric(10,4), so a row written outside
      // setManualExchangeRate — or before it normalized — can carry a 4th
      // decimal. Whatever is persisted as `exchange_rate_applied` has to be
      // the number the charge was actually derived from, or the receipt
      // cannot be reconciled against the amount on the card.
      const result = resolvePriceForNationality(
        "German",
        paidEvent,
        rate(3.7515, "manual_override")
      );

      expect(result?.exchangeRate).toBe(3.752);
      expect(result!.displayPriceUsd! * result!.exchangeRate!).toBeCloseTo(
        result!.chargeAmountPen,
        10
      );
    });

    it("flags that no margin was applied, so checkout does not claim one", () => {
      // Checkout tells the buyer how the charge was derived. Saying "BCRP plus
      // a margin" on a hand-set rate would be false, and this flag is the only
      // thing that lets the UI tell the two apart.
      const manual = resolvePriceForNationality("German", paidEvent, rate(3.9, "manual_override"));
      const auto = resolvePriceForNationality("German", paidEvent, rate(3.9, "bcrp_auto"));

      expect(manual?.includesMargin).toBe(false);
      expect(auto?.includesMargin).toBe(true);
    });

    it("differs from an automatic rate of the same numeric value", () => {
      const auto = resolvePriceForNationality("German", paidEvent, rate(3.5, "bcrp_auto"));
      const manual = resolvePriceForNationality("German", paidEvent, rate(3.5, "manual_override"));

      expect(auto?.exchangeRate).toBe(3.6);
      expect(manual?.exchangeRate).toBe(3.5);
    });
  });

  describe("refusing to guess", () => {
    it("returns null for a non-Peruvian buyer when no rate exists", () => {
      expect(resolvePriceForNationality("German", paidEvent, null)).toBeNull();
    });

    it("returns null when the event is missing either source price", () => {
      const r = rate(3.5, "bcrp_auto");
      expect(resolvePriceForNationality("German", { price_pen: null, price_usd: 30 }, r)).toBeNull();
      expect(resolvePriceForNationality("German", { price_pen: 90, price_usd: null }, r)).toBeNull();
      expect(
        resolvePriceForNationality("Peruvian", { price_pen: null, price_usd: null }, r)
      ).toBeNull();
    });
  });
});
