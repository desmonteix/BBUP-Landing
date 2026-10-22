import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const m = vi.hoisted(() => ({ profile: vi.fn(), read: vi.fn(), lookup: vi.fn(), apply: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentProfile: m.profile }));
vi.mock("@/lib/mercadopago", () => ({
  lookupPaymentByRegistration: m.lookup,
}));
vi.mock("@/lib/db/payments", () => ({ applyPaymentToRegistration: m.apply }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => {
  const query = { select: () => query, eq: () => query, maybeSingle: m.read };
  return query;
} }) }));
import CheckoutReturnPage from "./page";

const registration = { payment_status: "pending", payment_method: "mercadopago", profile_id: "owner", event_id: "event", amount_pen: 80, display_price_eur: null };
const payment = { id: "mp1", status: "in_process", externalReference: "r1", transactionAmount: 80, currencyId: "PEN" };
const render = async (params = { registration_id: "r1" }) => renderToStaticMarkup(await CheckoutReturnPage({ searchParams: Promise.resolve(params) }));

beforeEach(() => {
  vi.resetAllMocks();
  m.profile.mockResolvedValue({ id: "owner", nationality: "Peruvian" });
  m.read.mockResolvedValue({ data: { title: "Test event" } }).mockResolvedValueOnce({ data: registration });
  m.lookup.mockResolvedValue({ ok: true, payment: null });
  m.apply.mockResolvedValue("still-pending");
});

it("does not claim to be confirming a payment when none exists", async () => {
  const html = await render();
  expect(html).toContain("Payment not completed");
  expect(html).not.toContain("Confirming your payment");
  expect(m.apply).not.toHaveBeenCalled();
});

it.each(["pending", "in_process", "authorized"])("only shows processing for a verified %s payment", async status => {
  m.lookup.mockResolvedValue({ ok: true, payment: { ...payment, status } });
  m.read.mockResolvedValueOnce({ data: registration });
  expect(await render()).toContain("Confirming your payment");
});

it("does not confuse a provider error with an unpaid reservation", async () => {
  m.lookup.mockResolvedValue({ ok: false, error: "Unavailable" });
  const html = await render();
  expect(html).toContain("Unable to verify payment");
  expect(html).not.toContain("Payment not completed");
  expect(html).not.toContain("Mercado Pago is finishing up");
});

it("shows approved payments only after saving and re-reading their status", async () => {
  m.lookup.mockResolvedValue({ ok: true, payment: { ...payment, status: "approved" } });
  m.apply.mockResolvedValue("paid");
  m.read.mockResolvedValueOnce({ data: { ...registration, payment_status: "paid" } });
  const html = await render();
  expect(html).toContain("80.00 paid.");
  expect(html).not.toContain("Confirming your payment");
  expect(m.apply).toHaveBeenCalledWith(expect.objectContaining({ status: "approved" }));
});

it("does not call a mismatched approved payment confirmed or processing", async () => {
  m.lookup.mockResolvedValue({ ok: true, payment: { ...payment, status: "approved" } });
  m.apply.mockResolvedValue("payment-mismatch");
  m.read.mockResolvedValueOnce({ data: registration });
  expect(await render()).toContain("Unable to verify payment");
});

it("directs pending transfers to their transfer instructions", async () => {
  m.read.mockReset().mockResolvedValueOnce({ data: { ...registration, payment_method: "transfer" } }).mockResolvedValue({ data: { title: "Test event" } });
  const html = await render();
  expect(html).toContain("Complete your bank transfer");
  expect(html).toContain('href="/checkout/transfer/r1"');
  expect(m.lookup).not.toHaveBeenCalled();
});

it.each([null, { id: "another-owner", nationality: "Peruvian" }])("does not imply a payment or expose details to a non-owner", async profile => {
  m.profile.mockResolvedValue(profile);
  const html = await render();
  expect(html).toContain("Payment status unavailable");
  expect(html).not.toContain("Confirming your payment");
  expect(html).not.toContain("Test event");
  expect(m.lookup).not.toHaveBeenCalled();
});
