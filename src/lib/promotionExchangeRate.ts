import "server-only";
import type { PromotionExchangeRate } from "@/lib/types";

/** BCRP PD04648PD: daily EUR/PEN selling rate. Cache refreshes automatically hourly. */
export async function getEuroPromotionRate(): Promise<PromotionExchangeRate | null> {
  const end = new Date();
  const start = new Date(end.getTime() - 10 * 86400000);
  const date = (value: Date) => `${value.getUTCFullYear()}-${value.getUTCMonth() + 1}-${value.getUTCDate()}`;
  try {
    const response = await fetch(`https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04648PD/json/${date(start)}/${date(end)}/ing`, {
      next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("periods" in data) || !Array.isArray(data.periods)) return null;
    for (const period of [...data.periods].reverse()) {
      if (!period || typeof period !== "object" || !Array.isArray(period.values) || typeof period.name !== "string") continue;
      const rate = Number(period.values[0]);
      if (Number.isFinite(rate) && rate > 0) return { currency: "EUR", rate, date: period.name, source: "BCRP PD04648PD" };
    }
  } catch {
    console.error("[promotionExchangeRate] EUR/PEN unavailable");
  }
  // Never invent a rate or sell an EUR package at an unconverted amount.
  return null;
}
