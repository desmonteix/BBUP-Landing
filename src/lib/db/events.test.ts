import { expect, it, vi } from "vitest";
const admin = vi.hoisted(() => ({ from: vi.fn() }));
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
