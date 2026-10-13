import { describe, expect, it } from "vitest";
import { quoteTickets } from "./offers";
const price = { chargeAmountPen: 90, displayPriceUsd: null, exchangeRate: null, includesMargin: false };
const now = Date.parse("2026-10-13T12:00:00Z");
const active = { startsAt: "2026-10-13T00:00:00Z", endsAt: "2026-10-15T00:00:00Z" };
describe("automatic offers", () => {
  it("charges both entries without an offer", () => { expect(quoteTickets(price, 2, {}, now)).toMatchObject({ chargeAmountPen: 180, savingsPen: 0 }); });
  it("2x1 charges one entry but admits two", () => { expect(quoteTickets(price, 2, { promotion: { type: "two_for_one", ...active } }, now)).toMatchObject({ chargeAmountPen: 90, appliedOffer: "2x1" }); });
  it("2x1 does not reduce an individual entry", () => { expect(quoteTickets(price, 1, { promotion: { type: "two_for_one", ...active } }, now).chargeAmountPen).toBe(90); });
  it("uses the cheaper offer without stacking", () => { expect(quoteTickets(price, 2, { promotion: { type: "two_for_one", ...active }, discount: { type: "percentage", value: 20, ...active } }, now).chargeAmountPen).toBe(90); });
  it("a larger discount beats 2x1", () => { expect(quoteTickets(price, 2, { promotion: { type: "two_for_one", ...active }, discount: { type: "percentage", value: 60, ...active } }, now).chargeAmountPen).toBe(72); });
  it("applies fixed PEN discounts once per order", () => { expect(quoteTickets(price, 2, { discount: { type: "fixed", value: 30, ...active } }, now).chargeAmountPen).toBe(150); });
  it("does not charge negative amounts", () => { expect(quoteTickets(price, 1, { discount: { type: "fixed", value: 100, ...active } }, now).chargeAmountPen).toBe(0); });
  it.each(["2026-10-12T23:59:59Z", "2026-10-15T00:00:00Z"])("respects start and exclusive end: %s", (time) => { expect(quoteTickets(price, 2, { promotion: { type: "two_for_one", ...active } }, Date.parse(time)).chargeAmountPen).toBe(180); });
  it("uses integer cents for percentage rounding", () => { expect(quoteTickets({ ...price, chargeAmountPen: 1.15 }, 1, { discount: { type: "percentage", value: 10, ...active } }, now).chargeAmountPen).toBe(1.04); });
  it("adjusts the USD reference when a PEN discount is applied", () => { expect(quoteTickets({ ...price, chargeAmountPen: 105, displayPriceUsd: 30, exchangeRate: 3.5 }, 2, { discount: { type: "fixed", value: 35, ...active } }, now)).toMatchObject({ chargeAmountPen: 175, displayPriceUsd: 50 }); });
});

describe("custom package promotions", () => {
  const window = { startsAt: "2000-01-01T00:00:00Z", endsAt: "2100-01-01T00:00:00Z" };
  const euroRate = { currency: "EUR" as const, rate: 4.1, date: "2026-10-13", source: "Frankfurter" };
  it("charges exactly 45 EUR converted to PEN for two tickets", () => {
    expect(quoteTickets({ ...price, chargeAmountPen: 120 }, 2, { promotion: { type: "bundle_price", quantity: 2, amount: 45, currency: "EUR", ...window } }, now, euroRate)).toMatchObject({ available: true, chargeAmountPen: 184.5, savingsPen: 55.5, promotionReference: { amount: 45, currency: "EUR", rate: 4.1 } });
  });
  it("customizes the package price in PEN", () => {
    expect(quoteTickets(price, 2, { promotion: { type: "bundle_price", quantity: 2, amount: 45, currency: "PEN", ...window } }, now)).toMatchObject({ chargeAmountPen: 45 });
  });
  it("does not apply a two-ticket package to a single entry", () => {
    expect(quoteTickets(price, 1, { promotion: { type: "bundle_price", quantity: 2, amount: 45, currency: "EUR", ...window } }, now)).toMatchObject({ available: true, chargeAmountPen: 90 });
  });
  it("blocks the package when its conversion rate is unavailable", () => {
    expect(quoteTickets(price, 2, { promotion: { type: "bundle_price", quantity: 2, amount: 45, currency: "EUR", ...window } }, now)).toMatchObject({ available: false });
  });
  it("compares a package against discounts without stacking", () => {
    expect(quoteTickets({ ...price, chargeAmountPen: 120 }, 2, { promotion: { type: "bundle_price", quantity: 2, amount: 45, currency: "EUR", ...window }, discount: { type: "percentage", value: 50, ...window } }, now, euroRate)).toMatchObject({ chargeAmountPen: 120, promotionReference: null });
  });
});
