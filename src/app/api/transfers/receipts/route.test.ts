import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ profile: vi.fn(), registration: vi.fn(), existing: vi.fn(), upload: vi.fn(), remove: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentProfile: m.profile }));
vi.mock("@/lib/cloudinary", () => ({ receiptsConfigured: () => true, uploadReceipt: m.upload, deleteReceipt: m.remove }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({
  rpc: m.rpc,
  from: (table: string) => {
    const q = { select: () => q, eq: vi.fn(() => q), order: () => q, maybeSingle: m.registration, limit: m.existing };
    if (table === "registrations") q.eq = vi.fn(() => q);
    return q;
  },
}) }));
import { POST } from "./route";
const id = "00000000-0000-4000-8000-000000000001";
function request(bytes: number[] = [255, 216, 255, 224], currency = "EUR", origin = "https://bbup.pe") {
  const body = new FormData();
  body.set("registrationId", id); body.set("currency", currency);
  body.set("receipt", new Blob([new Uint8Array(bytes)]), "receipt.jpg");
  return new Request("https://bbup.pe/api/transfers/receipts", { method: "POST", headers: { origin, "content-length": "1000" }, body });
}
beforeEach(() => {
  vi.clearAllMocks();
  m.profile.mockResolvedValue({ id: "buyer", nationality: "German" });
  m.registration.mockResolvedValue({ data: { id, payment_status: "pending", payment_method: "transfer", display_price_eur: 30 }, error: null });
  m.existing.mockResolvedValue({ data: [], error: null });
  m.upload.mockResolvedValue("bbup-receipts/asset");
  m.rpc.mockResolvedValue({ error: null });
  m.remove.mockResolvedValue(undefined);
});
it("rejects unauthenticated uploads without contacting storage", async () => {
  m.profile.mockResolvedValue(null);
  expect((await POST(request())).status).toBe(401); expect(m.upload).not.toHaveBeenCalled();
});
it("rejects cross-origin requests", async () => {
  expect((await POST(request(undefined, "PEN", "https://attacker.example"))).status).toBe(403);
  expect(m.upload).not.toHaveBeenCalled();
});
it("rejects reservations inaccessible to the buyer", async () => {
  m.registration.mockResolvedValue({ data: null, error: null });
  expect((await POST(request())).status).toBe(409); expect(m.upload).not.toHaveBeenCalled();
});
it("does not accept invented euro amounts", async () => {
  m.registration.mockResolvedValue({ data: { id, payment_status: "pending", payment_method: "transfer", display_price_eur: null }, error: null });
  expect((await POST(request(undefined, "EUR"))).status).toBe(400); expect(m.upload).not.toHaveBeenCalled();
});
it("rejects non-image content despite its filename", async () => {
  expect((await POST(request([60, 115, 118, 103]))).status).toBe(400); expect(m.upload).not.toHaveBeenCalled();
});
it("does not accept another receipt while one awaits review", async () => {
  m.existing.mockResolvedValue({ data: [{ status: "pending" }], error: null });
  expect((await POST(request())).status).toBe(409); expect(m.upload).not.toHaveBeenCalled();
});
it("stores a receipt through the atomic database function without marking the ticket paid", async () => {
  expect((await POST(request())).status).toBe(200);
  expect(m.rpc).toHaveBeenCalledWith("submit_transfer_receipt", expect.objectContaining({ p_registration: id, p_profile: "buyer", p_currency: "EUR", p_asset: "bbup-receipts/asset" }));
});
it("rejects Peruvian buyers before uploading a transfer receipt", async () => {
  m.profile.mockResolvedValue({ id: "buyer", nationality: "Peruvian" });
  expect((await POST(request())).status).toBe(403);
  expect(m.upload).not.toHaveBeenCalled();
});
it("rejects transfers in soles", async () => {
  expect((await POST(request(undefined, "PEN"))).status).toBe(400);
  expect(m.upload).not.toHaveBeenCalled();
});
it("rejects receipts for a Mercado Pago reservation", async () => {
  m.registration.mockResolvedValue({ data: { id, payment_status: "pending", payment_method: "mercadopago", display_price_eur: 30 }, error: null });
  expect((await POST(request())).status).toBe(409);
  expect(m.upload).not.toHaveBeenCalled();
});
it("removes the unused image if the database rejects a raced submission", async () => {
  m.rpc.mockResolvedValue({ error: { message: "Already paid" } });
  expect((await POST(request())).status).toBe(409); expect(m.remove).toHaveBeenCalledWith("bbup-receipts/asset");
});
