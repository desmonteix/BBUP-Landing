import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/actions/registrations", () => ({ createTicketIntent: vi.fn() }));
import { TicketForm } from "./TicketForm";
import type { OfferRules, ResolvedPrice } from "@/lib/types";

const local: ResolvedPrice = { chargeAmountPen: 80, displayPriceEur: null, exchangeRate: null, includesMargin: false, staffEntryAvailable: true, companionPricePen: 96 };
const foreign: ResolvedPrice = { chargeAmountPen: 96, displayPriceEur: 24, exchangeRate: 4, includesMargin: false };
const window = { startsAt: "2000-01-01T00:00:00Z", endsAt: "2100-01-01T00:00:00Z" };
function render(price: ResolvedPrice, offerRules: OfferRules = {}) {
  return renderToStaticMarkup(createElement(TicketForm, {
    eventId: "event", isLoggedIn: true, resolvedPrice: price, allowCompanion: true,
    termsText: "Terms", termsUrl: "", termsVersion: "v1", offerRules,
    promotionExchangeRate: { currency: "EUR", rate: 4, date: "today", source: "BCRP" },
  }));
}
describe("nationality-specific checkout", () => {
  it("shows Peru only soles and Mercado Pago", () => {
    const html = render(local);
    expect(html).toContain("S/ 80.00");
    expect(html).toContain("Mercado Pago");
    expect(html).not.toMatch(/€|EUR|transferencia|Bank transfer/i);
  });
  it("shows foreigners only euros and bank transfer", () => {
    const html = render(foreign);
    expect(html).toContain("€ 24.00");
    expect(html).toContain("Bank transfer");
    expect(html).not.toMatch(/S\/|PEN|soles|Mercado Pago/);
  });
  it("does not expose a euro package to Peru", () => {
    const html = render(local, { promotion: { ...window, type: "bundle_price", quantity: 1, amount: 10, currency: "EUR" } });
    expect(html).toContain("S/ 40.00");
    expect(html).not.toMatch(/€|EUR/);
  });
  it("shows foreign discounts and savings only in euros", () => {
    const html = render(foreign, { discount: { ...window, type: "fixed", value: 8 } });
    expect(html).toContain("€ 22.00");
    expect(html).toContain("€ 2.00");
    expect(html).not.toMatch(/S\/|PEN|soles|Mercado Pago/);
  });
});
