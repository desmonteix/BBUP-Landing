import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ validate: vi.fn(), payment: vi.fn(), apply: vi.fn() }));
vi.mock("mercadopago", () => ({ WebhookSignatureValidator: { validate: mocks.validate }, InvalidWebhookSignatureError: class extends Error {} }));
vi.mock("@/lib/mercadopago", () => ({ getMercadoPagoPayment: mocks.payment }));
vi.mock("@/lib/db/payments", () => ({ applyPaymentToRegistration: mocks.apply }));
import { POST } from "./route";
const request = () => new NextRequest("http://localhost/api/mercadopago/webhook?data.id=123", { method: "POST", body: JSON.stringify({ type: "payment" }) });
beforeEach(() => { vi.clearAllMocks();vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "fixture"); });
afterEach(() => vi.unstubAllEnvs());
it("requests a retry when Mercado Pago cannot be queried instead of losing the notification", async () => {
  mocks.payment.mockResolvedValue(null);
  expect((await POST(request())).status).toBe(503);
  expect(mocks.validate).toHaveBeenCalled();expect(mocks.apply).not.toHaveBeenCalled();
});
it("settles a verified provider payment normally", async () => {
  const payment = { id: "123", externalReference: "registration", status: "approved" };
  mocks.payment.mockResolvedValue(payment);mocks.apply.mockResolvedValue("paid");
  const response = await POST(request());
  expect(response.status).toBe(200);expect(await response.json()).toEqual({ ok: true, outcome: "paid" });
  expect(mocks.apply).toHaveBeenCalledWith(payment);
});
it("requests a retry when the database cannot persist the confirmed payment", async () => {
  mocks.payment.mockResolvedValue({ id: "123", externalReference: "registration" });mocks.apply.mockRejectedValue(new Error("offline"));
  expect((await POST(request())).status).toBe(500);
});
