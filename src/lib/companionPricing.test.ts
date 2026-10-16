import { expect, it } from "vitest";
import { resolveTicketPricing } from "./pricing";
import { quoteTickets } from "./offers";
const event = { price_pen: 80, price_eur: 24 };
const rate = { id: "rate", rate: 4, source: "manual_override" as const, updated_at: "2026-10-15" };

it("charges staff 80 plus the international PEN price of 96", () => {
  const price = resolveTicketPricing("Peruvian", event, rate, false)!;
  expect(quoteTickets(price, 1).chargeAmountPen).toBe(80);
  expect(quoteTickets(price, 2)).toMatchObject({ chargeAmountPen: 176, displayPriceEur: null });
});
it("charges 96 for a separate companion purchase after the staff entry", () => {
  const price = resolveTicketPricing("Peruvian", event, rate, true)!;
  expect(quoteTickets(price, 1)).toMatchObject({ chargeAmountPen: 96, displayPriceEur: null, isAdditionalTicket: true });
});
it("keeps both international tickets at the buyer's EUR price", () => {
  const price = resolveTicketPricing("German", event, rate, false)!;
  expect(quoteTickets(price, 2)).toMatchObject({ chargeAmountPen: 192, displayPriceEur: 48 });
});
it("keeps the international price for a later companion purchase", () => {
  expect(resolveTicketPricing("German", event, rate, true)).toMatchObject({ chargeAmountPen: 96, displayPriceEur: 24, isAdditionalTicket: true });
});
it("allows a staff entry without an FX rate but blocks the companion", () => {
  const price = resolveTicketPricing("Peruvian", event, null, false)!;
  expect(quoteTickets(price, 1)).toMatchObject({ available: true, chargeAmountPen: 80 });
  expect(quoteTickets(price, 2).available).toBe(false);
  expect(resolveTicketPricing("Peruvian", event, null, true)).toBeNull();
});
it("applies the existing automatic markup to the companion", () => {
  expect(quoteTickets(resolveTicketPricing("Peruvian", event, { ...rate, source: "bcrp_auto" }, false)!, 2).chargeAmountPen).toBe(178.4);
});
it("applies discounts to the mixed subtotal", () => {
  const price = resolveTicketPricing("Peruvian", event, rate, false)!;
  expect(quoteTickets(price, 2, { discount: { type: "percentage", value: 10, startsAt: "2000-01-01", endsAt: "2100-01-01" } })).toMatchObject({ subtotalPen: 176, chargeAmountPen: 158.4 });
});
