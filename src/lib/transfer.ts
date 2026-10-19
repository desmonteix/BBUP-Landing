export const transferAccounts = {
  PEN: { holder: "Mariah Guevara", bank: "BCP", account: "19311559118075", cci: "0021931155911807512" },
  EUR: { bank: "Santander", holder: "Erickson Aaron Edgar Lazaro Rivera", iban: "ES53 0049 4734 3226 1667 6917", bic: "BSCHESMMXXX", address: "Calle de Muntaner 448, Sarrià-Sant-Gervasi, Barcelona" },
};

export function receiptFormat(bytes: Uint8Array): "jpg" | "png" | null {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)) return "png";
  return null;
}
export function transferEuroAmount(amount: number | null, amountPen?: number | null, rate?: number | null): number | null {
  if (amount != null && Number.isFinite(amount) && amount > 0) return amount;
  if (amountPen == null || !Number.isFinite(amountPen) || amountPen <= 0 || rate == null || !Number.isFinite(rate) || rate <= 0) return null;
  const converted = Math.round(amountPen / rate * 100) / 100;
  return Number.isFinite(converted) && converted > 0 ? converted : null;
}
