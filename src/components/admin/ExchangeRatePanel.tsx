"use client";

import { useActionState } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { setManualExchangeRate, type ExchangeRateFormState } from "@/lib/actions/admin";
import type { ExchangeRate } from "@/lib/types";

const initialState: ExchangeRateFormState = { status: "idle" };

export function ExchangeRatePanel({
  currentRate,
  isStale,
}: {
  currentRate: ExchangeRate | null;
  isStale: boolean;
}) {
  const [state, formAction, pending] = useActionState(setManualExchangeRate, initialState);

  return (
    <div className="rounded-md border border-border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <TrendingUp size={18} className="text-pink" />
        <h2 className="font-display text-lg font-semibold text-ink">USD → PEN exchange rate</h2>
      </div>

      {currentRate ? (
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-2xl font-semibold text-ink">
            S/ {currentRate.rate.toFixed(3)}
          </span>
          <span className="text-sm text-ink/55">per US$</span>
          <span className="text-xs text-ink/40">
            · {currentRate.source === "bcrp_auto" ? "BCRP (automatic)" : "Manual override"} ·
            updated {new Date(currentRate.updated_at).toLocaleString("en-US")}
          </span>
        </div>
      ) : (
        <p className="mt-4 text-sm text-error">
          No exchange rate on record yet — non-Peruvian buyers can&rsquo;t check out for paid
          events until one is set (the daily BCRP job or a manual override below).
        </p>
      )}

      {isStale && currentRate && (
        <p className="mt-3 flex items-center gap-2 rounded-md bg-error/10 px-3 py-2 text-sm font-semibold text-error">
          <AlertTriangle size={16} />
          This rate is more than 48 hours old — the daily BCRP job may be failing. Set a manual
          rate below if this doesn&rsquo;t resolve on its own.
        </p>
      )}

      <form action={formAction} className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="rate" className="mb-1.5 block text-sm font-semibold text-ink/80">
            Manual override
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
      <p className="mt-3 text-xs text-ink/45">
        A daily job pulls the official BCRP (Banco Central de Reserva del Perú) rate
        automatically — only set this by hand if that job has been failing.
      </p>
    </div>
  );
}
