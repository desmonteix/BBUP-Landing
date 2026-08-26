import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ExchangeRate } from "@/lib/types";

const STALE_AFTER_HOURS = 48;

/**
 * Latest USD -> PEN rate, whichever source it came from (BCRP cron or an
 * organizer's manual override — see spec §5, §11). Returns null if the
 * table is empty (fresh install before the cron has run once and before
 * any admin has set a manual rate) — callers must treat that as "can't
 * price non-Peruvian tickets yet," never fall back to a guessed number.
 */
export async function getCurrentExchangeRate(): Promise<ExchangeRate | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exchange_rates")
    .select("id, rate, source, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[exchangeRate] fetch failed", error);
    return null;
  }
  return data as ExchangeRate | null;
}

export function isExchangeRateStale(rate: ExchangeRate): boolean {
  const ageMs = Date.now() - new Date(rate.updated_at).getTime();
  return ageMs > STALE_AFTER_HOURS * 60 * 60 * 1000;
}

/**
 * Writes a new current-rate row. Never overwrites history in place — the
 * table is append-only, "current" is just "latest by updated_at" (see
 * migration 0002) — so a receipt stamped with `exchange_rate_applied` at
 * charge time stays accurate even after the rate moves.
 */
export async function recordExchangeRate(
  rate: number,
  source: "bcrp_auto" | "manual_override"
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isFinite(rate) || rate <= 0) {
    return { ok: false, error: "Rate must be a positive number." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("exchange_rates")
    .insert({ rate, source, updated_at: new Date().toISOString() });

  if (error) {
    console.error("[exchangeRate] insert failed", error);
    return { ok: false, error: "Could not save the exchange rate." };
  }
  return { ok: true };
}
