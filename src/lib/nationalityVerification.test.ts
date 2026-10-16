import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: mocks.from }) }));
import { verifyNationalityClaim } from "./nationalityVerification";
const claim = { firstName: " Ana ", lastName: " Perez ", nationality: "Peruvian", dniId: "61234567", context: "signup" as const };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue({ insert: mocks.insert });
  mocks.insert.mockResolvedValue({ error: null });
});
it("records the person's name and Nacionalidad fallida before returning TypeError", async () => {
  expect(await verifyNationalityClaim(claim)).toMatchObject({ status: "error", errorType: "TypeError", message: expect.stringContaining("DNI inválido") });
  expect(mocks.from).toHaveBeenCalledWith("nationality_failures");
  expect(mocks.insert).toHaveBeenCalledWith({ full_name: "Ana Perez", profile_id: null, message: "Nacionalidad fallida", context: "signup" });
  expect(mocks.insert.mock.calls[0]?.[0]).not.toHaveProperty("dni_id");
});
it("links a failed profile claim to the authenticated person", async () => {
  await verifyNationalityClaim({ ...claim, profileId: "buyer", context: "profile" });
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ profile_id: "buyer", context: "profile" }));
});
it.each([{ nationality: "Peruvian", dniId: "71234567" }, { nationality: "German", dniId: "AB12345" }])("does not report valid claims", async (valid) => {
  expect(await verifyNationalityClaim({ ...claim, ...valid })).toBeNull();
  expect(mocks.insert).not.toHaveBeenCalled();
});
it.each(["response", "exception"])("still rejects an invalid claim if the audit fails: %s", async (failure) => {
  if (failure === "response") mocks.insert.mockResolvedValue({ error: { code: "offline" } });
  else mocks.insert.mockRejectedValue(new Error("offline"));
  expect(await verifyNationalityClaim(claim)).toMatchObject({ errorType: "TypeError" });
});
it("bounds untrusted names before storing them", async () => {
  await verifyNationalityClaim({ ...claim, firstName: "A".repeat(5000), lastName: "B".repeat(5000) });
  expect(mocks.insert.mock.calls[0]?.[0].full_name).toHaveLength(201);
});
