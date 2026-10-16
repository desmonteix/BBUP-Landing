import "server-only";
import { assertNationalityDni } from "@/lib/nationality";
import { createAdminClient } from "@/lib/supabase/admin";

/** The audit is a separate database request, so rejecting the profile cannot roll it back. */
export async function verifyNationalityClaim(input: {
  nationality: unknown;
  dniId: unknown;
  firstName: unknown;
  lastName: unknown;
  profileId?: string;
  context: "signup" | "profile" | "checkout";
}): Promise<{ status: "error"; errorType: "TypeError"; message: string } | null> {
  try {
    assertNationalityDni(input.nationality, input.dniId);
    return null;
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    const namePart = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 100) : "";
    const fullName = [namePart(input.firstName), namePart(input.lastName)].filter(Boolean).join(" ") || "Nombre no proporcionado";
    try {
      const { error: auditError } = await createAdminClient().from("nationality_failures").insert({
        full_name: fullName,
        profile_id: input.profileId ?? null,
        message: "Nacionalidad fallida",
        context: input.context,
      });
      if (auditError) console.error("[nationality] could not record Nacionalidad fallida");
    } catch {
      console.error("[nationality] could not record Nacionalidad fallida");
    }
    // A logging outage must never permit the rejected nationality claim.
    return { status: "error", errorType: "TypeError", message: `TypeError: ${error.message}` };
  }
}
