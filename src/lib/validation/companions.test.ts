import { describe, it, expect } from "vitest";
import { ticketIntentSchema, eventFormSchema } from "./schemas";
const eventId = "00000000-0000-4000-8000-000000000001";
describe("companion validation", () => {
  it("keeps individual purchases valid", () => {
    expect(ticketIntentSchema.safeParse({ eventId }).success).toBe(true);
  });
  it.each([{ firstName: "Ana", lastName: "" }, { firstName: " ", lastName: "Perez" }])("requires both companion names", (companion) => {
    expect(ticketIntentSchema.safeParse({ eventId, companion }).success).toBe(false);
  });
  it("preserves and trims companion names", () => {
    expect(ticketIntentSchema.parse({ eventId, companion: { firstName: " Ana ", lastName: " Perez " } })).toEqual({ eventId, companion: { firstName: "Ana", lastName: "Perez" } });
  });
});
describe("event configuration", () => {
  const event = { title: "Party", slug: "party", description: "Party", eventDate: "2026-11-01T20:00", location: "Lima", type: "free", category: "Events", status: "open" };
  it("preserves promotions, discounts and companion permission", () => {
    expect(eventFormSchema.parse({ ...event, allowCompanion: true, promotions: " 2x1 first two days ", discounts: " Students " })).toMatchObject({ allowCompanion: true, promotions: "2x1 first two days", discounts: "Students" });
  });
  it("rejects invalid event dates", () => {
    expect(eventFormSchema.safeParse({ ...event, eventDate: "invalid" }).success).toBe(false);
  });
});
