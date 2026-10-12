import { describe, it, expect } from "vitest";
import { selectPaymentForRegistration, type PaymentSearchHit } from "@/lib/mercadopago";

const REG = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

function hit(over: Partial<PaymentSearchHit> = {}): PaymentSearchHit {
  return {
    id: "1",
    status: "approved",
    external_reference: REG,
    date_created: "2026-10-12T00:00:00Z",
    transaction_amount: 3.55,
    ...over,
  };
}

describe("selectPaymentForRegistration", () => {
  it("returns nothing when the search came back empty", () => {
    expect(selectPaymentForRegistration([], REG)).toBeNull();
  });

  it("ignores payments belonging to another registration", () => {
    // The caller writes to whatever reference comes back, so a hit for
    // someone else's ticket must never be selected — it would mark their
    // registration paid and email them the receipt.
    const results = [hit({ id: "9", external_reference: OTHER })];

    expect(selectPaymentForRegistration(results, REG)).toBeNull();
  });

  it("keeps only this registration's payment out of a mixed response", () => {
    const results = [
      hit({ id: "9", external_reference: OTHER, status: "approved" }),
      hit({ id: "7", external_reference: REG, status: "approved" }),
    ];

    expect(selectPaymentForRegistration(results, REG)?.id).toBe("7");
  });

  it("maps the hit onto the shape the settler consumes", () => {
    const result = selectPaymentForRegistration([hit({ id: "42" })], REG);

    expect(result).toEqual({
      id: "42",
      status: "approved",
      externalReference: REG,
      transactionAmount: 3.55,
    });
  });

  it("prefers an approved payment over a newer rejected one", () => {
    // A buyer whose card was declined and who then paid with another method
    // has been charged. The successful attempt is the outcome, even though
    // it is not the last thing that happened on the account.
    const results = [
      hit({ id: "new", status: "rejected", date_created: "2026-10-12T10:00:00Z" }),
      hit({ id: "old", status: "approved", date_created: "2026-10-12T09:00:00Z" }),
    ];

    expect(selectPaymentForRegistration(results, REG)?.id).toBe("old");
  });

  it("falls back to the newest attempt when none was approved", () => {
    const results = [
      hit({ id: "older", status: "rejected", date_created: "2026-10-12T09:00:00Z" }),
      hit({ id: "newest", status: "pending", date_created: "2026-10-12T11:00:00Z" }),
      hit({ id: "middle", status: "rejected", date_created: "2026-10-12T10:00:00Z" }),
    ];

    expect(selectPaymentForRegistration(results, REG)?.id).toBe("newest");
  });

  it("picks the newest approved payment rather than an arbitrary one", () => {
    // Two approved payments means the buyer was charged twice; which one is
    // recorded must not depend on the order the API happened to return.
    const results = [
      hit({ id: "first", date_created: "2026-10-12T09:00:00Z" }),
      hit({ id: "second", date_created: "2026-10-12T10:00:00Z" }),
    ];

    expect(selectPaymentForRegistration(results, REG)?.id).toBe("second");
    expect(selectPaymentForRegistration([...results].reverse(), REG)?.id).toBe("second");
  });

  it("breaks an exact timestamp tie without consulting the input order", () => {
    // Array#sort is stable, so same-instant payments would otherwise be
    // decided by whatever order the API returned them in.
    const sameInstant = "2026-10-12T10:00:00Z";
    const results = [
      hit({ id: "aaa", date_created: sameInstant }),
      hit({ id: "bbb", date_created: sameInstant }),
    ];

    const forward = selectPaymentForRegistration(results, REG)?.id;
    const reversed = selectPaymentForRegistration([...results].reverse(), REG)?.id;

    expect(forward).toBe(reversed);
  });

  it("skips hits with no id, which cannot be recorded", () => {
    const results = [hit({ id: undefined, status: "approved" })];

    expect(selectPaymentForRegistration(results, REG)).toBeNull();
  });
});
