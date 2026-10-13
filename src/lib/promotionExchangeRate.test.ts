import { afterEach, expect, it, vi } from "vitest";
import { getEuroPromotionRate } from "./promotionExchangeRate";
afterEach(() => vi.unstubAllGlobals());
const today = "13.Oct.26";
it("loads EUR/PEN automatically from the verified provider", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ periods: [{ name: today, values: ["4.1"] }, { name: "14.Oct.26", values: ["n.d."] }] }) });
  vi.stubGlobal("fetch", fetcher);
  expect(await getEuroPromotionRate()).toMatchObject({ currency: "EUR", rate: 4.1, date: today });
  expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("/PD04648PD/json/"), expect.objectContaining({ next: { revalidate: 3600 } }));
});
it.each([{ periods: [{ name: today, values: ["0"] }] }, { periods: [{ name: today, values: ["n.d."] }] }, {}])("rejects missing or invalid rates", async (data) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
  expect(await getEuroPromotionRate()).toBeNull();
});
it("fails closed when the provider is unavailable", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  expect(await getEuroPromotionRate()).toBeNull();
});
