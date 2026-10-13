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
  allowCompanion = false,
  spotsRemaining = null,
  termsText,
  termsUrl,
  termsVersion,
}: {
  eventId: string;
  isLoggedIn: boolean;
  resolvedPrice: ResolvedPrice | null;
  allowCompanion?: boolean;
  spotsRemaining?: number | null;
  termsText: string;
  termsUrl: string;
  termsVersion: string;
}) {
  const [intent, setIntent] = useState<Intent>({ state: "idle" });
  const [pending, startTransition] = useTransition();
  const [withCompanion, setWithCompanion] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const hasTerms = Boolean(termsText || termsUrl);
  const quantity = withCompanion ? 2 : 1;
  const totalPrice = resolvedPrice ? {
    ...resolvedPrice,
    chargeAmountPen: Math.round(resolvedPrice.chargeAmountPen * quantity * 100) / 100,
    displayPriceUsd: resolvedPrice.displayPriceUsd == null ? null : Math.round(resolvedPrice.displayPriceUsd * quantity * 100) / 100,
  } : null;

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
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      if (busy || !acceptedTerms || !hasTerms) return;
      startTransition(async () => {
        setIntent({ state: "creating" });
        try {
          const result = await createTicketIntent(eventId, withCompanion ? { firstName, lastName } : undefined, { accepted: acceptedTerms, version: termsVersion });
          if (!result.ok) { setIntent({ state: "error", message: result.error }); return; }
          setIntent({ state: "redirecting" });
          window.location.href = result.initPoint;
        } catch {
          setIntent({ state: "error", message: "Could not prepare checkout. Please try again." });
        }
      });
    }}>
      {allowCompanion && (
        <fieldset disabled={busy} className="space-y-3 rounded-md border border-border p-4">
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" checked={withCompanion} onChange={(e) => setWithCompanion(e.target.checked)}
              disabled={spotsRemaining != null && spotsRemaining < 2} className="h-4 w-4 accent-pink" />
            Llevo un +1 (acompañante)
          </label>
          <p className="text-xs text-ink/60">El +1 paga una entrada adicional al mismo precio que tu entrada.</p>
          {spotsRemaining != null && spotsRemaining < 2 && <p className="text-xs text-ink/60">Solo queda un cupo disponible.</p>}
          {withCompanion && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">Nombre del acompañante
                <input name="companionFirstName" autoComplete="off" value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={100}
                  className="mt-1 w-full rounded-sm border border-border px-3 py-2 font-normal outline-none focus-visible:border-pink" />
              </label>
              <label className="text-sm font-semibold">Apellido del acompañante
                <input name="companionLastName" autoComplete="off" value={lastName} onChange={(e) => setLastName(e.target.value)} required maxLength={100}
                  className="mt-1 w-full rounded-sm border border-border px-3 py-2 font-normal outline-none focus-visible:border-pink" />
              </label>
            </div>
          )}
        </fieldset>
      )}
      {totalPrice && (
        <div className="rounded-md border border-border bg-paper-sunk p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/70">
            Total ({quantity} {quantity === 1 ? "entrada" : "entradas"})
          </p>
          {totalPrice.displayPriceUsd != null && totalPrice.exchangeRate != null ? (
            <>
              <p className="mt-1 font-display text-2xl font-semibold text-ink">
                {formatMoney(totalPrice.displayPriceUsd, "USD")}
              </p>
              <p className="mt-1 text-sm text-ink/70">
                ≈ {formatMoney(totalPrice.chargeAmountPen, "PEN")} charged to your card
              </p>
              <p className="mt-1 text-xs text-ink/70">
                Mercado Pago (our payment provider in Peru) only processes soles, so your card is
                charged at our conversion rate of S/ {totalPrice.exchangeRate.toFixed(3)} per
                US$
                {totalPrice.includesMargin
                  ? ": Peru's official BCRP rate plus a small margin covering payment costs."
                  : ", set by hand by our team."}{" "}
                Your bank then converts that to your own currency at its own rate, and may add a
                foreign transaction fee.
              </p>
            </>
          ) : (
            <p className="mt-1 font-display text-2xl font-semibold text-ink">
              {formatMoney(totalPrice.chargeAmountPen, "PEN")}
            </p>
          )}
        </div>
      )}

      {hasTerms ? (
        <fieldset disabled={busy} className="space-y-3 rounded-md border border-border p-4">
          <legend className="px-2 text-sm font-semibold">Términos y condiciones</legend>
          {termsText && <div className="max-h-64 overflow-y-auto whitespace-pre-line break-words text-sm leading-relaxed text-ink/75" tabIndex={0} role="region" aria-label="Texto de los términos y condiciones">{termsText}</div>}
          {termsUrl && <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-pink underline">Leer términos y condiciones <ExternalLink size={14} /></a>}
          <label className="flex items-start gap-3 text-sm font-semibold">
            <input name="acceptedTerms" type="checkbox" required checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-pink" />
            He leído y acepto los términos y condiciones de este evento.
          </label>
        </fieldset>
      ) : <p role="status" className="text-sm text-ink/65">La compra estará disponible cuando el organizador publique los términos y condiciones.</p>}

      <button
        type="submit"
        disabled={busy || !resolvedPrice || !acceptedTerms || !hasTerms}
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
    </form>
  );
}
