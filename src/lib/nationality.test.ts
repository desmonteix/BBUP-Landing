import { expect, it } from "vitest";
import { assertNationalityDni } from "./nationality";
import { signupSchema } from "./validation/schemas";
const input = { firstName: "Ana", lastName: "Perez", nationality: "Peruvian", dniId: "71234567", email: "ana@example.com", password: "long-password" };
it.each(["8123456789", "7123456a", " 71234567", "71234567 ", "71234567\n", "7123-567"])("rejects every non-digit or incorrect length in Peruvian signup: %j", (dniId) => {
  expect(() => assertNationalityDni("Peruvian", dniId)).toThrow(TypeError);
  expect(signupSchema.safeParse({ ...input, dniId }).success).toBe(false);
});
it.each(["7123456", "712345678", "7abcdefg", "7 234567", "7.234567", "７１２３４５６７", "", null])("rejects invalid Peruvian DNI %s with TypeError", (dni) => {
  expect(() => assertNationalityDni("Peruvian", dni)).toThrow(TypeError);
  expect(() => assertNationalityDni("Peruvian", dni)).toThrow("DNI inválido");
});
it("accepts eight digits beginning with seven", () => {
  expect(() => assertNationalityDni("Peruvian", "71234567")).not.toThrow();
  expect(signupSchema.safeParse(input).success).toBe(true);
});
it("also rejects invalid DNI in the signup schema", () => {
  expect(signupSchema.safeParse({ ...input, dniId: "8123456789" }).success).toBe(false);
});
it("keeps international passport numbers valid", () => {
  expect(() => assertNationalityDni("German", "AB12345")).not.toThrow();
  expect(signupSchema.safeParse({ ...input, nationality: "German", dniId: "AB12345" }).success).toBe(true);
});
