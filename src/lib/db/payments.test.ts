import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ registration: vi.fn(), update: vi.fn(), claim: vi.fn(), receipt: vi.fn() }));
vi.mock("@/lib/resend", () => ({ sendTicketReceipt: mocks.receipt }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: (table: string) => table === "events"
  ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { title: "Party", event_date: "2026-12-01", location: "Lima" } }) }) }) }
  : { select: () => ({ eq: () => ({ maybeSingle: mocks.registration }) }), update: (row: unknown) => {
    mocks.update(row);return { eq: () => ({ neq: () => ({ select: mocks.claim }) }) };
  } } }) }));
import { applyPaymentToRegistration } from "./payments";
const payment = { id: "mp1", externalReference: "r1", status: "approved", transactionAmount: 80, currencyId: "PEN" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.registration.mockResolvedValue({ data: { id: "r1", event_id: "event", amount_pen: 80, payment_status: "pending", ticket_quantity: 1 }, error: null });
  mocks.claim.mockResolvedValue({ data: [{ id: "r1" }], error: null });
});
it("marks a verified matching payment paid and sends one receipt", async () => {
  expect(await applyPaymentToRegistration(payment)).toBe("paid");
  expect(mocks.update).toHaveBeenCalledWith({ payment_status: "paid", mercadopago_payment_id: "mp1" });
  expect(mocks.receipt).toHaveBeenCalledOnce();
});
it.each([{ transactionAmount: 79 }, { transactionAmount: undefined }, { currencyId: "USD" }, { currencyId: undefined }])("does not mark an unverified amount/currency as paid", async overrides => {
  expect(await applyPaymentToRegistration({ ...payment, ...overrides })).toBe("payment-mismatch");
  expect(mocks.update).not.toHaveBeenCalled();expect(mocks.receipt).not.toHaveBeenCalled();
});
it("does not send duplicate receipts if already claimed by the webhook", async () => {
  mocks.claim.mockResolvedValue({ data: [], error: null });
  expect(await applyPaymentToRegistration(payment)).toBe("already-paid");
  expect(mocks.receipt).not.toHaveBeenCalled();
});
it("throws on read errors so webhook notifications can be retried", async () => {
  mocks.registration.mockResolvedValue({ data: null, error: { code: "offline" } });
  await expect(applyPaymentToRegistration(payment)).rejects.toThrow("Could not read");
});
it("never downgrades a transfer under review for a rejected card attempt", async () => {
  mocks.registration.mockResolvedValue({ data: { id: "r1", payment_method: "transfer", payment_status: "pending" }, error: null });
  expect(await applyPaymentToRegistration({ ...payment, status: "rejected" })).toBe("still-pending");
  expect(mocks.update).not.toHaveBeenCalled();
});
