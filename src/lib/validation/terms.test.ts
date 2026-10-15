import { describe, expect, it } from "vitest";
import { eventFormSchema } from "./schemas";
const event = { title: "Party", slug: "party", description: "Party", eventDate: "2026-12-01T20:00", location: "Lima", type: "paid", pricePen: 90, priceEur: 30, category: "Events", status: "open" };
describe("event terms configuration", () => {
  it("requires text or a link for paid events", () => {
    expect(eventFormSchema.safeParse(event).success).toBe(false);
  });
  it("accepts and preserves text terms", () => {
    expect(eventFormSchema.parse({ ...event, termsText: " No refunds " })).toMatchObject({ termsText: "No refunds" });
  });
  it("accepts HTTPS links", () => {
    expect(eventFormSchema.parse({ ...event, termsUrl: "https://example.com/terms" })).toMatchObject({ termsUrl: "https://example.com/terms" });
  });
  it.each(["javascript:alert(1)", "data:text/html,test", "not a URL"])("rejects unsafe links: %s", (termsUrl) => {
    expect(eventFormSchema.safeParse({ ...event, termsUrl }).success).toBe(false);
  });
  it("does not require terms for free RSVPs", () => {
    expect(eventFormSchema.safeParse({ ...event, type: "free" }).success).toBe(true);
  });
});
