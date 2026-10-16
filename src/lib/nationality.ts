/** Business format rule only; this is not an identity or citizenship lookup. */
export function isValidPeruvianDni(dni: unknown): dni is string {
  return typeof dni === "string" && dni.length === 8 && /^[0-9]{8}$/.test(dni);
}

export type NationalityApproval = "pending" | "approved" | "rejected";
export function requiresNationalityApproval(nationality: unknown, dni: unknown): boolean {
  return nationality === "Peruvian" && isValidPeruvianDni(dni) && !dni.startsWith("7");
}

export function getAccountApproval(profile: { nationality: string; dni_id: string; nationality_approval?: NationalityApproval }): NationalityApproval | "invalid" {
  if (profile.nationality !== "Peruvian") return "approved";
  if (!isValidPeruvianDni(profile.dni_id)) return "invalid";
  return requiresNationalityApproval(profile.nationality, profile.dni_id) ? profile.nationality_approval ?? "pending" : "approved";
}

export function accountApprovalMessage(profile: Parameters<typeof getAccountApproval>[0]): string | null {
  const status = getAccountApproval(profile);
  return status === "pending" ? "Tu cuenta está pendiente de aprobación del administrador. Podrás comprar entradas cuando sea aprobada."
    : status === "rejected" ? "El administrador no ha aprobado tu cuenta. Revisa tu DNI y nacionalidad o contacta con la organización."
    : status === "invalid" ? "DNI inválido. Corrige tu DNI y nacionalidad en tu cuenta antes de comprar." : null;
}

export function assertNationalityDni(nationality: unknown, dni: unknown): void {
  if (nationality === "Peruvian" && !isValidPeruvianDni(dni)) {
    throw new TypeError("DNI inválido. Debe tener exactamente 8 dígitos, sin letras, signos ni espacios.");
  }
}
