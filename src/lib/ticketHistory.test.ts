import { beforeEach, expect, it, vi } from "vitest";
const query = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), in: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => query }));
import { getEventsWithTickets } from "./ticketHistory";
beforeEach(() => {
  vi.clearAllMocks();
  query.from.mockReturnValue(query); query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
  query.in.mockReturnValueOnce(query);
});
it("counts only the authenticated buyer's pending and paid event tickets", async () => {
  query.in.mockResolvedValue({ data: [{ event_id: "event" }, { event_id: "event" }], error: null });
  expect(await getEventsWithTickets("buyer", ["event"])).toEqual(new Set(["event"]));
  expect(query.eq).toHaveBeenCalledWith("profile_id", "buyer");
  expect(query.eq).toHaveBeenCalledWith("kind", "ticket");
  expect(query.in).toHaveBeenLastCalledWith("payment_status", ["pending", "paid"]);
});
it("allows the personal staff rate again after failed attempts only", async () => {
  query.in.mockResolvedValue({ data: [], error: null });
  expect(await getEventsWithTickets("buyer", ["event"])).toEqual(new Set());
});
it("does not assume eligibility when the history query fails", async () => {
  query.in.mockResolvedValue({ data: null, error: { message: "offline" } });
  expect(await getEventsWithTickets("buyer", ["event"])).toBeNull();
});
