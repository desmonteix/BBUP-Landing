import { afterEach, expect, it, vi } from "vitest";

const { record } = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock("@/lib/exchangeRate", () => ({ recordExchangeRate: record }));
import { GET } from "./route";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

it("refreshes EUR/PEN from BCRP and skips unpublished periods", async () => {
  vi.stubEnv("CRON_SECRET", "test-secret");
  const fetcher = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ periods: [
    { name: "12.Oct.26", values: ["4.1"] }, { name: "13.Oct.26", values: ["n.d."] },
  ] }) });
  vi.stubGlobal("fetch", fetcher);
  record.mockResolvedValue({ ok: true });
  const response = await GET(new Request("http://localhost/api/cron/exchange-rate", { headers: { authorization: "Bearer test-secret" } }));
  expect(await response.json()).toEqual({ ok: true, rate: 4.1 });
  expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("/PD04648PD/json/"), expect.any(Object));
  expect(record).toHaveBeenCalledWith(4.1, "bcrp_auto");
});
