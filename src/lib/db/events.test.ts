import { expect, it, vi } from "vitest";
const admin = vi.hoisted(() => ({ from: vi.fn(), history: vi.fn() }));
vi.mock("@/lib/ticketHistory", () => ({ getEventsWithTickets: admin.history }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => admin }));
vi.mock("@/lib/exchangeRate", () => ({ getCurrentExchangeRate: async () => null }));
import { listEvents } from "./events";
it("counts every attendee without relying on the viewer's self-only registration policy", async () => {
  const event = { id: "event", slug: "party", title: "Party", description: "Party", event_date: "2026-12-01", location: "Lima", type: "paid", status: "open", category: "Events", cover_image: null, price_pen: 90, price_eur: 30, capacity: 5, allow_companion: true, promotions: "2x1", discounts: "Students", terms_text: "No refunds", terms_url: "" };
  const user = { from: vi.fn((table: string) => table === "events"
    ? { select: () => ({ gte: () => ({ order: async () => ({ data: [event], error: null }) }) }) }
    : { select: () => ({ in: () => ({ in: async () => ({ data: [], error: null }) }) }) }) };
  admin.from.mockReturnValue({ select: () => ({ in: () => ({ in: async () => ({ data: [{ event_id: "event", ticket_quantity: 2 }, { event_id: "event", ticket_quantity: 1 }], error: null }) }) }) });
  const [result] = await listEvents(user as never, { when: "upcoming", viewerNationality: "Peruvian" });
  if (!result) throw new Error("Expected one event");
  expect(result.spots_remaining).toBe(2);
  expect(result).toMatchObject({ allow_companion: true, promotions: "2x1", discounts: "Students", resolved_price: { chargeAmountPen: 90 } });
  expect(result).not.toHaveProperty("price_pen");expect(result).not.toHaveProperty("price_eur");
  expect(user.from).not.toHaveBeenCalledWith("registrations");
});

it("uses the buyer's previous purchase to preview the separate companion price", async () => {
  const event = { id: "event", type: "paid", price_pen: 80, price_eur: 24, capacity: null, allow_companion: true, terms_text: "Terms", terms_url: "", offer_rules: {} };
  const user = { from: () => ({ select: () => ({ gte: () => ({ order: async () => ({ data: [event], error: null }) }) }) }) };
  admin.history.mockResolvedValue(new Set(["event"]));
  const [result] = await listEvents(user as never, { when: "upcoming", viewerNationality: "Peruvian", viewerProfileId: "buyer" });
  expect(admin.history).toHaveBeenCalledWith("buyer", ["event"]);
  // No EUR rate is available: don't preview a second staff-price entry.
  expect(result?.resolved_price).toBeNull();
});

it("does not advertise the personal tariff when purchase history is unavailable", async () => {
  const event = { id: "event", type: "paid", price_pen: 80, price_eur: 24, capacity: null, terms_text: "Terms", terms_url: "", offer_rules: {} };
  const user = { from: () => ({ select: () => ({ gte: () => ({ order: async () => ({ data: [event], error: null }) }) }) }) };
  admin.history.mockResolvedValue(null);
  const [result] = await listEvents(user as never, { when: "upcoming", viewerNationality: "Peruvian", viewerProfileId: "buyer" });
  expect(result?.resolved_price).toBeNull();
});
