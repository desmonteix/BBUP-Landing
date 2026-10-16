import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.admin }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { reviewNationality } from "./approvals";
const id = "00000000-0000-4000-8000-000000000001";
const form = (decision = "approved") => { const f = new FormData();f.set("decision", decision);return f; };
beforeEach(() => { vi.clearAllMocks();mocks.admin.mockResolvedValue(undefined);mocks.rpc.mockResolvedValue({ error: null }); });
it("cannot approve accounts without admin authorization", async () => {
  mocks.admin.mockRejectedValue(new Error("Not authorized"));
  expect(await reviewNationality(id, "81234567", "Peruvian", { status: "idle" }, form())).toMatchObject({ status: "error" });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it.each(["approved", "rejected"])("sends the decision through an authenticated database check: %s", async decision => {
  expect(await reviewNationality(id, "81234567", "Peruvian", { status: "idle" }, form(decision))).toMatchObject({ status: "success" });
  expect(mocks.rpc).toHaveBeenCalledWith("review_nationality", { p_profile_id: id, p_dni: "81234567", p_nationality: "Peruvian", p_decision: decision });
  expect(mocks.revalidate).toHaveBeenCalledWith("/account");
});
it("does not approve a changed document or completed review", async () => {
  mocks.rpc.mockResolvedValue({ error: { message: "changed" } });
  expect(await reviewNationality(id, "81234567", "Peruvian", { status: "idle" }, form())).toMatchObject({ status: "error" });
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
it("rejects malformed documents before invoking the review function", async () => {
  expect(await reviewNationality(id, "8123456a", "Peruvian", { status: "idle" }, form())).toMatchObject({ status: "error" });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
