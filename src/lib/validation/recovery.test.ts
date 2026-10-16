import { describe, it, expect } from "vitest";
import { forgotPasswordSchema, resetPasswordSchema, signupSchema } from "@/lib/validation/schemas";

describe("forgotPasswordSchema", () => {
  it("normalizes the address so casing and spacing cannot fork a lookup", () => {
    const parsed = forgotPasswordSchema.parse({ email: "  Mati.Desmonteix@Gmail.com  " });

    expect(parsed.email).toBe("mati.desmonteix@gmail.com");
  });

  it("rejects anything that is not an address", () => {
    expect(forgotPasswordSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  const token = "a".repeat(56);

  it("accepts a token and a long enough password", () => {
    expect(resetPasswordSchema.safeParse({ tokenHash: token, password: "newpass123" }).success).toBe(
      true
    );
  });

  it("holds the same password floor as signup, so a reset is not a way around it", () => {
    const short = "short7!";
    expect(resetPasswordSchema.safeParse({ tokenHash: token, password: short }).success).toBe(false);

    // Pinned to signup rather than to the literal 8, so raising one and
    // forgetting the other fails here instead of in production.
    const signupPassword = signupSchema.innerType().shape.password;
    expect(signupPassword.safeParse(short).success).toBe(false);
    expect(signupPassword.safeParse("newpass123").success).toBe(true);
  });

  it("requires a token, so the form cannot post a password alone", () => {
    expect(resetPasswordSchema.safeParse({ tokenHash: "", password: "newpass123" }).success).toBe(
      false
    );
    expect(resetPasswordSchema.safeParse({ password: "newpass123" }).success).toBe(false);
  });

  it("bounds the token instead of forwarding any length to the auth API", () => {
    const huge = "a".repeat(513);

    expect(resetPasswordSchema.safeParse({ tokenHash: huge, password: "newpass123" }).success).toBe(
      false
    );
  });
});
