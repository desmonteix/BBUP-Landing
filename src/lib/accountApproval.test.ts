import { expect, it } from "vitest";
import { getAccountApproval, requiresNationalityApproval, assertNationalityDni } from "./nationality";
it("automatically accepts a valid eight-digit DNI starting with seven", () => {
  expect(getAccountApproval({ nationality: "Peruvian", dni_id: "71234567" })).toBe("approved");
});
it.each(["61234567", "81234567", "01234567"])("requires admin approval for an eight-digit DNI %s", dni => {
  expect(() => assertNationalityDni("Peruvian", dni)).not.toThrow();
  expect(requiresNationalityApproval("Peruvian", dni)).toBe(true);
  expect(getAccountApproval({ nationality: "Peruvian", dni_id: dni })).toBe("pending");
});
it("accepts a manual approval and preserves an admin rejection", () => {
  expect(getAccountApproval({ nationality: "Peruvian", dni_id: "81234567", nationality_approval: "approved" })).toBe("approved");
  expect(getAccountApproval({ nationality: "Peruvian", dni_id: "81234567", nationality_approval: "rejected" })).toBe("rejected");
});
it.each(["8123456789", "8123456a", " 81234567", "81234567 "])("never approves malformed DNI %j, even with a stale approved flag", dni => {
  expect(() => assertNationalityDni("Peruvian", dni)).toThrow(TypeError);
  expect(getAccountApproval({ nationality: "Peruvian", dni_id: dni, nationality_approval: "approved" })).toBe("invalid");
});
it("does not apply the DNI approval process to foreign passports", () => {
  expect(requiresNationalityApproval("German", "AB12345")).toBe(false);
  expect(getAccountApproval({ nationality: "German", dni_id: "AB12345" })).toBe("approved");
});
