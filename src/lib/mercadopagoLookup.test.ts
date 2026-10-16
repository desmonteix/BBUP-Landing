import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("mercadopago", () => ({ MercadoPagoConfig: class {}, Payment: class { search = mocks.search; }, Preference: class {} }));
import { lookupPaymentByRegistration } from "./mercadopago";
beforeEach(() => { vi.clearAllMocks();vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "fixture"); });
afterEach(() => vi.unstubAllEnvs());
it("distinguishes a successful empty search from an API failure", async () => {
  mocks.search.mockResolvedValue({ results: [] });
  expect(await lookupPaymentByRegistration("registration")).toEqual({ ok: true, payment: null });
});
it("reports rejected credentials without presenting them as no payment", async () => {
  mocks.search.mockRejectedValue({ status: 401 });
  expect(await lookupPaymentByRegistration("registration")).toMatchObject({ ok: false, error: expect.stringContaining("Credenciales") });
});
it("surfaces outages instead of pretending a buyer has not paid", async () => {
  mocks.search.mockRejectedValue({ status: 503 });
  expect(await lookupPaymentByRegistration("registration")).toMatchObject({ ok: false });
});
it("preserves the verified amount, currency and registration reference", async () => {
  mocks.search.mockResolvedValue({ results: [{ id: "mp1", external_reference: "registration", status: "approved", transaction_amount: 80, currency_id: "PEN" }] });
  expect(await lookupPaymentByRegistration("registration")).toMatchObject({ ok: true, payment: { id: "mp1", externalReference: "registration", transactionAmount: 80, currencyId: "PEN" } });
});
