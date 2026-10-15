import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn(), insert: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: mocks.from }) }));
import { getCurrentExchangeRate, recordExchangeRate } from "./exchangeRate";
beforeEach(() => {
  vi.clearAllMocks();
  for (const fn of [mocks.from, mocks.select, mocks.eq, mocks.order, mocks.limit]) fn.mockReturnValue(mocks);
});
it("only reads EUR rates, excluding historical USD rows", async () => {
  const rate = { id: "euro", rate: 4.1, source: "bcrp_auto", updated_at: "2026-10-14" };
  mocks.maybeSingle.mockResolvedValue({ data: rate, error: null });
  expect(await getCurrentExchangeRate()).toEqual(rate);
  expect(mocks.eq).toHaveBeenCalledWith("base_currency", "EUR");
});
it("tags new automatic and manual rates as EUR", async () => {
  mocks.insert.mockResolvedValue({ error: null });
  for (const source of ["bcrp_auto", "manual_override"] as const) {
    expect(await recordExchangeRate(4.1, source)).toEqual({ ok: true });
    expect(mocks.insert).toHaveBeenLastCalledWith(expect.objectContaining({ rate: 4.1, source, base_currency: "EUR" }));
  }
});
it("returns no rate when none is available", async () => {
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  expect(await getCurrentExchangeRate()).toBeNull();
});