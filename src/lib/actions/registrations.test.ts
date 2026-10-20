import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ profile: vi.fn(), event: vi.fn(), rate: vi.fn(), euroRate: vi.fn(), preference: vi.fn(), insert: vi.fn(), bookings: vi.fn(), update: vi.fn(), history: vi.fn(), insertError: vi.fn() }));
vi.mock("@/lib/ticketHistory", () => ({ getEventsWithTickets: mocks.history }));
vi.mock("@/lib/auth", () => ({ getCurrentProfile: mocks.profile }));
vi.mock("@/lib/db/events", () => ({ getEventRowById: mocks.event }));
vi.mock("@/lib/exchangeRate", () => ({ getCurrentExchangeRate: mocks.rate }));
vi.mock("@/lib/promotionExchangeRate", () => ({ getEuroPromotionRate: mocks.euroRate }));
vi.mock("@/lib/mercadopago", () => ({ createPaymentPreference: mocks.preference, getSiteUrl: () => "http://localhost:3000" }));
vi.mock("@/lib/resend", () => ({ sendRsvpConfirmation: vi.fn(), sendTicketReceipt: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => ({
  select: () => ({ eq: () => ({ in: mocks.bookings }) }),
  insert: (row: unknown) => { mocks.insert(row); return { select: () => ({ single: async () => ({ data: { id: "booking" }, error: mocks.insertError() ?? null }) }) }; },
  update: (row: unknown) => { mocks.update(row); return { eq: async () => ({ error: null }) }; },
}) }) }));
import { createTicketIntent } from "./registrations";
import { createHash } from "node:crypto";
const eventId = "00000000-0000-4000-8000-000000000001";
const event = { id: eventId, title: "Party", type: "paid", status: "open", price_pen: 90, price_eur: 30, capacity: 10, allow_companion: true, terms_text: "No refunds", terms_url: "" };
const companion = { firstName: " Ana ", lastName: " Perez " };
const consent = { accepted: true, version: createHash("sha256").update(JSON.stringify(["No refunds", ""])).digest("hex") };
const buy = (id: string, plusOne?: { firstName: string; lastName: string }) => createTicketIntent(id, plusOne, consent);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.history.mockResolvedValue(new Set());
  mocks.insertError.mockReturnValue(null);
  mocks.profile.mockResolvedValue({ id: "buyer", first_name: "Luis", last_name: "Diaz", email: "buyer@example.com", nationality: "Peruvian", dni_id: "71234567" });
  mocks.event.mockResolvedValue(event);
  mocks.euroRate.mockResolvedValue(null);
  mocks.rate.mockResolvedValue({ rate: 3.5, source: "manual_override" });
  mocks.bookings.mockResolvedValue({ data: [], error: null });
  mocks.preference.mockResolvedValue({ ok: true, initPoint: "https://example.com/pay" });
});
describe("ticket purchases", () => {
  it("explains that transfers are unavailable when the database migration is missing", async () => {
    mocks.profile.mockResolvedValue({ id: "buyer", nationality: "German", first_name: "Ana", last_name: "Perez" });
    mocks.insertError.mockReturnValue({ code: "PGRST204", message: "Could not find the 'payment_method' column of 'registrations' in the schema cache" });
    expect(await createTicketIntent(eventId, undefined, consent, "transfer")).toMatchObject({ ok: false, error: expect.stringContaining("Bank transfers are not enabled yet") });
    expect(mocks.preference).not.toHaveBeenCalled();
  });
  it("reserves a transfer without creating a Mercado Pago checkout", async () => {
    mocks.profile.mockResolvedValue({ id: "buyer", nationality: "German", first_name: "Ana", last_name: "Perez" });
    expect(await createTicketIntent(eventId, undefined, consent, "transfer")).toMatchObject({ ok: true, initPoint: "/checkout/transfer/booking", displayPriceEur: 30 });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ payment_method: "transfer", payment_status: "pending" }));
    expect(mocks.preference).not.toHaveBeenCalled();
  });
  it.each(["pending", "rejected"])("does not sell tickets before account approval: %s", async nationality_approval => {
    mocks.profile.mockResolvedValue({ id: "buyer", first_name: "Ana", last_name: "Perez", nationality: "Peruvian", dni_id: "81234567", nationality_approval });
    expect(await buy(eventId)).toMatchObject({ ok: false });
    expect(mocks.preference).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("allows the staff tariff after a manual administrator approval", async () => {
    mocks.profile.mockResolvedValue({ id: "buyer", first_name: "Ana", last_name: "Perez", nationality: "Peruvian", dni_id: "81234567", nationality_approval: "approved" });
    expect(await buy(eventId)).toMatchObject({ ok: true, chargeAmountPen: 90 });
  });
  it("blocks an existing Peruvian profile with an invalid DNI before pricing or payment", async () => {
    mocks.profile.mockResolvedValue({ id: "buyer", first_name: "Ana", last_name: "Perez", nationality: "Peruvian", dni_id: "6123456789" });
    expect(await buy(eventId)).toMatchObject({ ok: false, error: expect.stringContaining("TypeError: DNI inválido") });
    expect(mocks.preference).not.toHaveBeenCalled();
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ full_name: "Ana Perez", message: "Nacionalidad fallida", context: "checkout" }));
  });
  it("charges one entry without a companion", async () => {
    expect(await buy(eventId)).toMatchObject({ ok: true, chargeAmountPen: 90 });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ ticket_quantity: 1, companion_first_name: null, amount_pen: 90 }));
    expect(mocks.preference).toHaveBeenCalledWith(expect.objectContaining({ amountPen: 90 }));
  });
  it("charges two entries and saves both companion names", async () => {
    expect(await buy(eventId, companion)).toMatchObject({ ok: true, chargeAmountPen: 195 });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ ticket_quantity: 2, companion_first_name: "Ana", companion_last_name: "Perez", amount_pen: 195 }));
    expect(mocks.preference).toHaveBeenCalledWith(expect.objectContaining({ amountPen: 195 }));
  });
  it("reserves both foreign entries in euros by transfer", async () => {
    mocks.profile.mockResolvedValue({ id: "buyer", first_name: "Luis", last_name: "Diaz", email: "buyer@example.com", nationality: "German" });
    expect(await buy(eventId, companion)).toMatchObject({ ok: true, chargeAmountPen: 210, displayPriceEur: 60, exchangeRate: 3.5 });
    expect(mocks.preference).not.toHaveBeenCalled();
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ payment_method: "transfer", display_price_eur: 60 }));
  });
  it("rejects a forged transfer request from a Peruvian buyer", async () => {
    expect(await createTicketIntent(eventId, undefined, consent, "transfer")).toMatchObject({ ok: false });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.preference).not.toHaveBeenCalled();
  });
  it("rejects a forged Mercado Pago request from a foreign buyer", async () => {
    mocks.profile.mockResolvedValue({ id: "buyer", nationality: "German" });
    expect(await createTicketIntent(eventId, undefined, consent, "mercadopago")).toMatchObject({ ok: false });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.preference).not.toHaveBeenCalled();
  });
  it("rejects a forged companion request when disabled", async () => {
    mocks.event.mockResolvedValue({ ...event, allow_companion: false });
    expect(await buy(eventId, companion)).toMatchObject({ ok: false });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("rejects a companion without a surname before creating a payment", async () => {
    expect(await buy(eventId, { firstName: "Ana", lastName: " " })).toMatchObject({ ok: false });
    expect(mocks.preference).not.toHaveBeenCalled();
  });
  it("rejects two tickets when only one seat remains, counting existing companions", async () => {
    mocks.bookings.mockResolvedValue({ data: [{ ticket_quantity: 2 }, { ticket_quantity: 2 }, { ticket_quantity: 2 }, { ticket_quantity: 2 }, { ticket_quantity: 1 }], error: null });
    expect(await buy(eventId, companion)).toMatchObject({ ok: false });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("allows two entries when exactly two seats remain", async () => {
    mocks.bookings.mockResolvedValue({ data: Array.from({ length: 4 }, () => ({ ticket_quantity: 2 })), error: null });
    expect(await buy(eventId, companion)).toMatchObject({ ok: true });
  });
  it("does not sell when capacity cannot be checked", async () => {
    mocks.bookings.mockResolvedValue({ data: null, error: { message: "offline" } });
    expect(await buy(eventId, companion)).toMatchObject({ ok: false });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("releases both seats when payment preparation fails", async () => {
    mocks.preference.mockResolvedValue({ ok: false, error: "Unavailable" });
    expect(await buy(eventId, companion)).toEqual({ ok: false, error: "Unavailable" });
    expect(mocks.update).toHaveBeenCalledWith({ payment_status: "failed" });
  });
  it("requires authentication", async () => {
    mocks.profile.mockResolvedValue(null);
    expect(await buy(eventId, companion)).toMatchObject({ ok: false });
    expect(mocks.preference).not.toHaveBeenCalled();
  });
});

describe("event terms acceptance", () => {
  it("rejects buying without explicit acceptance", async () => {
    expect(await createTicketIntent(eventId)).toMatchObject({ ok: false });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.preference).not.toHaveBeenCalled();
  });
  it("rejects false acceptance", async () => {
    expect(await createTicketIntent(eventId, undefined, { ...consent, accepted: false })).toMatchObject({ ok: false });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("requires reacceptance when the organizer changes the terms", async () => {
    mocks.event.mockResolvedValue({ ...event, terms_text: "Updated terms" });
    expect(await buy(eventId)).toMatchObject({ ok: false });
    expect(mocks.preference).not.toHaveBeenCalled();
  });
  it("does not sell an old event with no terms configured", async () => {
    mocks.event.mockResolvedValue({ ...event, terms_text: "", terms_url: "" });
    expect(await buy(eventId)).toMatchObject({ ok: false });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("stores the accepted content and timestamp with the purchase", async () => {
    expect(await buy(eventId)).toMatchObject({ ok: true });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      terms_accepted_at: expect.any(String), terms_text_snapshot: "No refunds", terms_url_snapshot: "",
    }));
  });
});

describe("automatic offer checkout", () => {
  const window = { startsAt: "2000-01-01T00:00:00Z", endsAt: "2100-01-01T00:00:00Z" };
  it("charges 2x1 in Mercado Pago without stacking an active percentage discount", async () => {
    mocks.event.mockResolvedValue({ ...event, offer_rules: { promotion: { type: "two_for_one", ...window }, discount: { type: "percentage", value: 20, ...window } } });
    expect(await buy(eventId, companion)).toMatchObject({ ok: true, chargeAmountPen: 90 });
    expect(mocks.preference).toHaveBeenCalledWith(expect.objectContaining({ amountPen: 90 }));
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ ticket_quantity: 2, amount_pen: 90, pricing_snapshot: expect.objectContaining({ subtotalPen: 195, savingsPen: 105, appliedOffer: "2x1", promotionReference: null }) }));
  });
  it("charges a better percentage discount instead of 2x1", async () => {
    mocks.event.mockResolvedValue({ ...event, offer_rules: { promotion: { type: "two_for_one", ...window }, discount: { type: "percentage", value: 60, ...window } } });
    expect(await buy(eventId, companion)).toMatchObject({ ok: true, chargeAmountPen: 78 });
    expect(mocks.preference).toHaveBeenCalledWith(expect.objectContaining({ amountPen: 78 }));
  });
  it("applies fixed discounts to the converted PEN price for international buyers", async () => {
    mocks.profile.mockResolvedValue({ id: "buyer", first_name: "Luis", last_name: "Diaz", email: "buyer@example.com", nationality: "German" });
    mocks.event.mockResolvedValue({ ...event, offer_rules: { discount: { type: "fixed", value: 35, ...window } } });
    expect(await buy(eventId, companion)).toMatchObject({ ok: true, chargeAmountPen: 175, displayPriceEur: 50 });
    expect(mocks.preference).not.toHaveBeenCalled();
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ payment_method: "transfer", display_price_eur: 50 }));
  });
  it("does not send a different total than the buyer saw to Mercado Pago", async () => {
    expect(await createTicketIntent(eventId, companion, { ...consent, expectedAmountPen: 90 })).toMatchObject({ ok: false });
    expect(mocks.insert).not.toHaveBeenCalled();expect(mocks.preference).not.toHaveBeenCalled();
  });
  it("confirms fully discounted entries without calling Mercado Pago with zero", async () => {
    mocks.event.mockResolvedValue({ ...event, offer_rules: { discount: { type: "percentage", value: 100, ...window } } });
    expect(await buy(eventId, companion)).toMatchObject({ ok: true, chargeAmountPen: 0, initPoint: "/checkout/return?registration_id=booking" });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ payment_status: "paid", ticket_quantity: 2, amount_pen: 0 }));
    expect(mocks.preference).not.toHaveBeenCalled();
  });
});

describe("custom EUR package checkout", () => {
  const window = { startsAt: "2000-01-01T00:00:00Z", endsAt: "2100-01-01T00:00:00Z" };
  const rules = { promotion: { type: "bundle_price", quantity: 2, amount: 45, currency: "EUR", ...window } };
  it("sends the converted 45 EUR total to Mercado Pago and records its rate", async () => {
    mocks.event.mockResolvedValue({ ...event, price_pen: 120, offer_rules: rules });
    mocks.euroRate.mockResolvedValue({ currency: "EUR", rate: 4.1, date: "13.Oct.26", source: "BCRP PD04648PD" });
    expect(await createTicketIntent(eventId, companion, { ...consent, expectedAmountPen: 184.5 })).toMatchObject({ ok: true, chargeAmountPen: 184.5 });
    expect(mocks.preference).toHaveBeenCalledWith(expect.objectContaining({ amountPen: 184.5 }));
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ ticket_quantity: 2, pricing_snapshot: expect.objectContaining({ promotionReference: { currency: "EUR", amount: 45, rate: 4.1, date: "13.Oct.26", source: "BCRP PD04648PD" } }) }));
  });
  it("does not create a booking or payment if EUR conversion fails", async () => {
    mocks.event.mockResolvedValue({ ...event, offer_rules: rules });
    expect(await buy(eventId, companion)).toMatchObject({ ok: false });
    expect(mocks.preference).not.toHaveBeenCalled();expect(mocks.insert).not.toHaveBeenCalled();
  });
});

describe("separate companion purchases", () => {
  it("charges staff 80 and their companion 96 in the same order", async () => {
    mocks.event.mockResolvedValue({ ...event, price_pen: 80, price_eur: 24 });
    mocks.rate.mockResolvedValue({ rate: 4, source: "manual_override" });
    expect(await buy(eventId, companion)).toMatchObject({ ok: true, chargeAmountPen: 176, displayPriceEur: null });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ uses_staff_price: true, ticket_quantity: 2, amount_pen: 176 }));
  });
  it("charges the international PEN price for a separately purchased +1", async () => {
    mocks.history.mockResolvedValue(new Set([eventId]));
    mocks.event.mockResolvedValue({ ...event, price_pen: 80, price_eur: 24 });
    mocks.rate.mockResolvedValue({ rate: 4, source: "manual_override" });
    expect(await createTicketIntent(eventId, companion, { ...consent, expectedAmountPen: 96 })).toMatchObject({ ok: true, chargeAmountPen: 96, displayPriceEur: null });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ uses_staff_price: false, is_companion_ticket: true, ticket_quantity: 1, companion_first_name: "Ana", amount_pen: 96 }));
    expect(mocks.preference).toHaveBeenCalledWith(expect.objectContaining({ amountPen: 96 }));
  });
  it("preserves foreign pricing for a separately purchased +1", async () => {
    mocks.history.mockResolvedValue(new Set([eventId]));
    mocks.profile.mockResolvedValue({ id: "buyer", first_name: "Luis", last_name: "Diaz", email: "buyer@example.com", nationality: "German" });
    expect(await buy(eventId, companion)).toMatchObject({ ok: true, chargeAmountPen: 105, displayPriceEur: 30 });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ ticket_quantity: 1, uses_staff_price: false }));
  });
  it("requires names when purchasing a separate companion", async () => {
    mocks.history.mockResolvedValue(new Set([eventId]));
    expect(await buy(eventId)).toMatchObject({ ok: false });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("rejects an outdated staff-price preview after a prior reservation", async () => {
    mocks.history.mockResolvedValue(new Set([eventId]));
    expect(await createTicketIntent(eventId, companion, { ...consent, expectedAmountPen: 90 })).toMatchObject({ ok: false });
    expect(mocks.preference).not.toHaveBeenCalled();
  });
  it("fails closed when previous purchases cannot be checked", async () => {
    mocks.history.mockResolvedValue(null);
    expect(await buy(eventId)).toMatchObject({ ok: false });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("cannot silently use the staff tariff for a companion when FX is unavailable", async () => {
    mocks.rate.mockResolvedValue(null);
    expect(await buy(eventId, companion)).toMatchObject({ ok: false });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(await buy(eventId)).toMatchObject({ ok: true, chargeAmountPen: 90 });
  });
  it("does not open payment when a simultaneous checkout claimed the staff rate", async () => {
    mocks.insertError.mockReturnValue({ code: "23505" });
    expect(await buy(eventId)).toMatchObject({ ok: false, error: expect.stringContaining("another checkout") });
    expect(mocks.preference).not.toHaveBeenCalled();
  });
  it("still sells a separate companion if exactly one seat remains", async () => {
    mocks.history.mockResolvedValue(new Set([eventId]));
    mocks.bookings.mockResolvedValue({ data: [{ ticket_quantity: 9 }], error: null });
    expect(await buy(eventId, companion)).toMatchObject({ ok: true, chargeAmountPen: 105 });
  });
});
