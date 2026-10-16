import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), range: vi.fn(), reconcile: vi.fn(), revalidate: vi.fn(), query: { select: vi.fn(), eq: vi.fn(), order: vi.fn() } }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.admin }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/paymentReconciliation", () => ({ reconcileRegistrations: mocks.reconcile }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => mocks.query }) }));
import { refreshEventPayments } from "./payments";
const eventId = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.clearAllMocks();mocks.admin.mockResolvedValue(undefined);
  const chain = { ...mocks.query, range: mocks.range };
  for (const fn of Object.values(mocks.query)) fn.mockReturnValue(chain);
  mocks.range.mockResolvedValue({ data: [{ id: "r1", payment_status: "pending" }], error: null });
  mocks.reconcile.mockResolvedValue({ checked: 1, confirmed: 1, failed: 0, notFound: 0, errors: 0, checks: {} });
});
it("requires administrator access before querying or changing payment states", async () => {
  mocks.admin.mockRejectedValue(new Error("Not authorized"));
  await expect(refreshEventPayments(eventId, { status: "idle" }, new FormData())).rejects.toThrow("Not authorized");
  expect(mocks.range).not.toHaveBeenCalled();expect(mocks.reconcile).not.toHaveBeenCalled();
});
it("limits reconciliation to the selected event and refreshes its displayed states", async () => {
  expect(await refreshEventPayments(eventId, { status: "idle" }, new FormData())).toMatchObject({ status: "success" });
  expect(mocks.query.eq).toHaveBeenCalledWith("event_id", eventId);
  expect(mocks.query.eq).toHaveBeenCalledWith("kind", "ticket");
  expect(mocks.revalidate).toHaveBeenCalledWith(`/admin/events/${eventId}`);
});
it("paginates stable rows including paid rows so recovered payments do not skip buyers", async () => {
  mocks.range.mockResolvedValue({ data: Array.from({ length: 21 }, (_, i) => ({ id: `r${i}`, payment_status: "pending" })), error: null });
  expect(await refreshEventPayments(eventId, { status: "idle" }, new FormData())).toMatchObject({ nextOffset: 20 });
  expect(mocks.reconcile.mock.calls[0]?.[0]).toHaveLength(20);
  await refreshEventPayments(eventId, { status: "success", nextOffset: 20 }, new FormData());
  expect(mocks.range).toHaveBeenLastCalledWith(20, 40);
});
it("surfaces provider errors instead of calling the batch successful", async () => {
  mocks.reconcile.mockResolvedValue({ checked: 1, confirmed: 0, failed: 0, notFound: 0, errors: 1, checks: { r1: "error" }, message: "Credenciales no válidas" });
  expect(await refreshEventPayments(eventId, { status: "idle" }, new FormData())).toMatchObject({ status: "error", message: expect.stringContaining("Credenciales") });
});
