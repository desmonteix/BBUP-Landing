"use client";

import { useActionState } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { setManualExchangeRate, type ExchangeRateFormState } from "@/lib/actions/admin";
import type { ExchangeRate } from "@/lib/types";

const initialState: ExchangeRateFormState = { status: "idle" };

/**
 * One nullable object rather than parallel nullable props, so "there is a rate"
 * and "here is what it charges" cannot disagree. With separate props a caller
 * could pass a rate with no charged value; the panel would then claim no rate
 * exists while the staleness warning below described one. Grouping them makes
 * that state unrepresentable instead of merely unlikely.
 */
export type ExchangeRatePanelData = {
  current: ExchangeRate;
  /** Rate actually applied at checkout: BCRP plus the margin, or a manual rate as-is. */
  chargedRate: number;
  markup: number;
  isStale: boolean;
};

export function ExchangeRatePanel({ rate }: { rate: ExchangeRatePanelData | null }) {
  const [state, formAction, pending] = useActionState(setManualExchangeRate, initialState);

  return (
    <div className="rounded-md border border-border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <TrendingUp size={18} className="text-pink" />
        <h2 className="font-display text-lg font-semibold text-ink">USD → PEN exchange rate</h2>
      </div>

      {rate ? (
        <>
          {/* Lead with the rate buyers are actually charged — the BCRP figure
              alone would not explain the amounts on their receipts. */}
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-2xl font-semibold text-ink">
              S/ {rate.chargedRate.toFixed(3)}
            </span>
            <span className="text-sm text-ink/70">per US$ charged to non-Peruvian buyers</span>
          </div>
          <p className="mt-1 text-xs text-ink/70">
            {rate.current.source === "bcrp_auto"
              ? `BCRP reference S/ ${rate.current.rate.toFixed(3)} + S/ ${rate.markup.toFixed(3)} margin`
              : "Set by hand — charged exactly as entered, no margin added"}{" "}
            · updated {new Date(rate.current.updated_at).toLocaleString("en-US")}
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-error">
          No exchange rate on record yet — non-Peruvian buyers can&rsquo;t check out for paid
          events until one is set (the daily BCRP job or a manual rate below).
        </p>
      )}

      {rate?.isStale && (
        /* bg-error/5 rather than /10: the heavier tint drags text-error on it
           down to 4.39:1, under the 4.5:1 AA needs for 14px semibold. */
        <p className="mt-3 flex items-center gap-2 rounded-md bg-error/5 px-3 py-2 text-sm font-semibold text-error">
          <AlertTriangle size={16} />
          This rate is more than 48 hours old
          {rate.current.source === "bcrp_auto"
            ? " — the daily BCRP job may be failing. Set a rate by hand below if this doesn't resolve on its own."
            : " — it was set by hand and nothing has refreshed it since. Update it below, or let the daily BCRP job take over once it recovers."}
        </p>
      )}

      <form action={formAction} className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="rate" className="mb-1.5 block text-sm font-semibold text-ink/80">
            Set the rate by hand
          </label>
          <input
            id="rate"
            name="rate"
            type="number"
            step="0.001"
            min="0"
            placeholder="3.750"
            className="w-40 rounded-sm border border-border bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors duration-200 focus-visible:border-pink focus-visible:shadow-glow"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-full bg-ink px-5 py-2.5 text-sm font-display font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Set rate"}
        </button>
        {state.status === "error" && (
          <p className="w-full text-sm font-semibold text-error" role="alert">
            {state.message}
          </p>
        )}
        {state.status === "idle" && state.message && (
          <p className="w-full text-sm font-semibold text-success" role="status">
            {state.message}
          </p>
        )}
      </form>
      <p className="mt-3 text-xs text-ink/70">
        A daily job pulls the official BCRP (Banco Central de Reserva del Perú) rate and adds the
        margin for you — only set a rate here if that job has been failing. No margin is added to
        what you type, so include it yourself. Rates are kept to 3 decimals.
      </p>
    </div>
  );
}
