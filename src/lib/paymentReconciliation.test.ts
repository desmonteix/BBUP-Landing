import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), apply: vi.fn() }));
vi.mock("@/lib/mercadopago", () => ({ lookupPaymentByRegistration: mocks.lookup }));
vi.mock("@/lib/db/payments", () => ({ applyPaymentToRegistration: mocks.apply }));
import { reconcileRegistrations } from "./paymentReconciliation";
beforeEach(() => { vi.clearAllMocks(); });
it("recovers confirmed payments missing their webhook", async () => {
  const payment = { id: "mp1", status: "approved", externalReference: "r1", transactionAmount: 80 };
  mocks.lookup.mockResolvedValue({ ok: true, payment });mocks.apply.mockResolvedValue("paid");
  expect(await reconcileRegistrations([{ id: "r1", payment_status: "pending" }])).toMatchObject({ confirmed: 1, errors: 0 });
  expect(mocks.apply).toHaveBeenCalledWith(payment);
});
it("does not confuse an authentication failure with an unpaid buyer", async () => {
  mocks.lookup.mockResolvedValue({ ok: false, error: "Credenciales de Mercado Pago no válidas." });
  expect(await reconcileRegistrations([{ id: "r1", payment_status: "pending" }])).toMatchObject({ confirmed: 0, errors: 1, checks: { r1: "error" }, message: expect.stringContaining("Credenciales") });
  expect(mocks.apply).not.toHaveBeenCalled();
});
it("keeps a missing payment unconfirmed", async () => {
  mocks.lookup.mockResolvedValue({ ok: true, payment: null });
  expect(await reconcileRegistrations([{ id: "r1", payment_status: "pending" }])).toMatchObject({ notFound: 1, checks: { r1: "not-found" } });
  expect(mocks.apply).not.toHaveBeenCalled();
});
it("does not downgrade or email an already-paid registration", async () => {
  expect(await reconcileRegistrations([{ id: "r1", payment_status: "paid" }])).toMatchObject({ checked: 0 });
  expect(mocks.lookup).not.toHaveBeenCalled();expect(mocks.apply).not.toHaveBeenCalled();
});
it("rechecks failed attempts which may have succeeded on retry", async () => {
  mocks.lookup.mockResolvedValue({ ok: true, payment: { status: "approved" } });mocks.apply.mockResolvedValue("paid");
  expect(await reconcileRegistrations([{ id: "r1", payment_status: "failed" }])).toMatchObject({ confirmed: 1 });
});
it("does not report mismatched amounts as paid", async () => {
  mocks.lookup.mockResolvedValue({ ok: true, payment: { status: "approved" } });mocks.apply.mockResolvedValue("payment-mismatch");
  expect(await reconcileRegistrations([{ id: "r1", payment_status: "pending" }])).toMatchObject({ confirmed: 0, errors: 1, checks: { r1: "error" } });
});
