/** Business format rule only; this is not an identity or citizenship lookup. */
export function isValidPeruvianDni(dni: unknown): boolean {
  return typeof dni === "string" && /^7[0-9]{7}$/.test(dni.trim());
}

export function assertNationalityDni(nationality: unknown, dni: unknown): void {
  if (nationality === "Peruvian" && !isValidPeruvianDni(dni)) {
    throw new TypeError("DNI inválido. Debe tener exactamente 8 dígitos y empezar por 7.");
  }
}
