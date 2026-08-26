/**
 * Pure currency formatting helpers — safe to import from Client Components
 * (unlike src/lib/pricing.ts, which is server-only because it contains the
 * nationality -> price resolution logic).
 */

export function toCulqiAmount(amount: number): number {
  return Math.round(amount * 100);
}

export function formatMoney(amount: number, currency: "PEN" | "USD"): string {
  const symbol = currency === "PEN" ? "S/" : "$";
  return `${symbol} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
