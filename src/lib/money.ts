/**
 * Pure currency formatting helpers — safe to import from Client Components
 * (unlike src/lib/pricing.ts, which is server-only because it contains the
 * nationality -> price resolution logic).
 */

export function formatMoney(amount: number, currency: "PEN" | "USD" | "EUR"): string {
  const symbol = currency === "PEN" ? "S/" : currency === "EUR" ? "\u20ac" : "$";
  return `${symbol} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
