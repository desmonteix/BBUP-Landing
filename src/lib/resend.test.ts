import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mocks.send }; } }));
import { sendTicketReceipt } from "./resend";

const receipt = {
  to: "fixture@example.com", name: "Fixture", eventTitle: "Event",
  eventDate: "2026-12-01T20:00:00Z", location: "Lima", amountPen: 96,
  exchangeRateApplied: 4, paymentId: "fixture", displayPriceEur: null as number | null,
  promotionReference: { currency: "EUR" as const, amount: 24, rate: 4, date: "today", source: "BCRP" },
};
beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "fixture-key");
  mocks.send.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());
it("sends Peru a receipt only in soles, including euro package purchases", async () => {
  await sendTicketReceipt(receipt);
  const html = mocks.send.mock.calls[0]![0].html;
  expect(html).toContain("S/ 96.00");
  expect(html).not.toMatch(/€|EUR/);
});
it("sends foreign buyers a receipt only in euros", async () => {
  await sendTicketReceipt({ ...receipt, displayPriceEur: 24 });
  const html = mocks.send.mock.calls[0]![0].html;
  expect(html).toContain("€ 24.00");
  expect(html).not.toMatch(/S\/|PEN|soles/);
});
