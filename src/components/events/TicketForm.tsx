"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, LogIn, ShieldCheck } from "lucide-react";
import { createTicketIntent } from "@/lib/actions/registrations";
import { formatMoney } from "@/lib/money";
import type { ResolvedPrice } from "@/lib/types";

type Intent =
  | { state: "idle" }
  | { state: "creating" }
  | { state: "redirecting" }
  | { state: "error"; message: string };

export function TicketForm({
  eventId,
  isLoggedIn,
  resolvedPrice,
}: {
  eventId: string;
  isLoggedIn: boolean;
  resolvedPrice: ResolvedPrice | null;
}) {
  const [intent, setIntent] = useState<Intent>({ state: "idle" });
  const [pending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <div className="rounded-md border border-border bg-paper-sunk p-5 text-center">
        <p className="text-sm text-ink/70">
          Ticket pricing depends on your profile, so you&rsquo;ll need an
          account first.
        </p>
        <Link
          href={`/login?redirect=/events`}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-buddy px-6 py-3 font-display font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg"
        >
          <LogIn size={18} />
          Log in to buy a ticket
        </Link>
        <p className="mt-3 text-xs text-ink/70">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-pink hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    );
  }

  const busy = pending || intent.state === "creating" || intent.state === "redirecting";

  return (
    <div className="space-y-4">
      {resolvedPrice && (
        <div className="rounded-md border border-border bg-paper-sunk p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/70">
            Your price
          </p>
          {resolvedPrice.displayPriceUsd != null && resolvedPrice.exchangeRate != null ? (
            <>
              <p className="mt-1 font-display text-2xl font-semibold text-ink">
                {formatMoney(resolvedPrice.displayPriceUsd, "USD")}
              </p>
              <p className="mt-1 text-sm text-ink/70">
                ≈ {formatMoney(resolvedPrice.chargeAmountPen, "PEN")} charged to your card
              </p>
              <p className="mt-1 text-xs text-ink/70">
                Mercado Pago (our payment provider in Peru) only processes soles, so your card is
                charged at our conversion rate of S/ {resolvedPrice.exchangeRate.toFixed(3)} per
                US$
                {resolvedPrice.includesMargin
                  ? ": Peru's official BCRP rate plus a small margin covering payment costs."
                  : ", set by hand by our team."}{" "}
                Your bank then converts that to your own currency at its own rate, and may add a
                foreign transaction fee.
              </p>
            </>
          ) : (
            <p className="mt-1 font-display text-2xl font-semibold text-ink">
              {formatMoney(resolvedPrice.chargeAmountPen, "PEN")}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() =>
          startTransition(async () => {
            setIntent({ state: "creating" });
            const result = await createTicketIntent(eventId);
            if (!result.ok) {
              setIntent({ state: "error", message: result.error });
              return;
            }
            setIntent({ state: "redirecting" });
            window.location.href = result.initPoint;
          })
        }
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-buddy px-6 py-3 font-display font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-60"
      >
        {intent.state === "redirecting" ? (
          "Taking you to Mercado Pago…"
        ) : intent.state === "creating" || pending ? (
          "Preparing checkout…"
        ) : (
          <>
            Continue to payment
            <ExternalLink size={16} />
          </>
        )}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-ink/70">
        <ShieldCheck size={14} />
        Secured by Mercado Pago — your card details never touch our servers.
      </p>

      {intent.state === "error" && (
        <p className="text-sm font-semibold text-error" role="alert">
          {intent.message}
        </p>
      )}
    </div>
  );
}
