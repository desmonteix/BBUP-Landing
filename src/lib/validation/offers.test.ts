import { describe, expect, it } from "vitest";
import { eventFormSchema, offerRulesSchema } from "./schemas";
const window = { startsAt: "2026-10-13T09:00:00-05:00", endsAt: "2026-10-15T09:00:00-05:00" };
describe("offer rules validation", () => {
  it("preserves scheduled rules", () => {
    const rules = { promotion: { type: "two_for_one", ...window }, discount: { type: "percentage", value: 20, ...window } };
    expect(offerRulesSchema.parse(rules)).toEqual(rules);
  });
  it.each([-1, 0, 101])("rejects invalid percentage %s", (value) => { expect(offerRulesSchema.safeParse({ discount: { type: "percentage", value, ...window } }).success).toBe(false); });
  it("requires the end after the start", () => { expect(offerRulesSchema.safeParse({ promotion: { type: "two_for_one", ...window, endsAt: window.startsAt } }).success).toBe(false); });
  it("requires valid dates", () => { expect(offerRulesSchema.safeParse({ discount: { type: "fixed", value: 10, ...window, startsAt: "invalid" } }).success).toBe(false); });
  it("requires companions to be enabled for 2x1", () => {
    expect(eventFormSchema.safeParse({ title: "Party", slug: "party", description: "Party", eventDate: "2026-12-01T20:00", location: "Lima", type: "paid", pricePen: 90, priceEur: 30, category: "Events", status: "open", termsText: "Terms", allowCompanion: false, offerRules: { promotion: { type: "two_for_one", ...window } } }).success).toBe(false);
  });
});

it("preserves a custom two-ticket EUR package", () => {
  expect(offerRulesSchema.parse({ promotion: { type: "bundle_price", quantity: 2, amount: 45, currency: "EUR", ...window } })).toMatchObject({ promotion: { quantity: 2, amount: 45, currency: "EUR" } });
});
it.each([{ quantity: 3, amount: 45, currency: "EUR" }, { quantity: 2, amount: -45, currency: "EUR" }, { quantity: 2, amount: 45, currency: "INVALID" }])("rejects invalid packages", (values) => {
  expect(offerRulesSchema.safeParse({ promotion: { type: "bundle_price", ...window, ...values } }).success).toBe(false);
});
