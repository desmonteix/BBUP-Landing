"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, LogIn, ShieldCheck } from "lucide-react";
import { createTicketIntent } from "@/lib/actions/registrations";
import { formatMoney } from "@/lib/money";
import { quoteTickets } from "@/lib/offers";
import type { OfferRules, ResolvedPrice, PromotionExchangeRate } from "@/lib/types";

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
  offerRules = {},
  promotionExchangeRate = null,
  purchaseBlockedReason,
}: {
  eventId: string;
  isLoggedIn: boolean;
  resolvedPrice: ResolvedPrice | null;
  allowCompanion?: boolean;
  spotsRemaining?: number | null;
  termsText: string;
  termsUrl: string;
  termsVersion: string;
  offerRules?: OfferRules;
  promotionExchangeRate?: PromotionExchangeRate | null;
  purchaseBlockedReason?: string | null;
}) {
  const [intent, setIntent] = useState<Intent>({ state: "idle" });
  const [pending, startTransition] = useTransition();
  const [withCompanion, setWithCompanion] = useState(false);
  const additionalTicket = resolvedPrice?.isAdditionalTicket === true;
  const needsCompanionNames = additionalTicket || withCompanion;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const currency = resolvedPrice?.displayPriceEur != null ? "EUR" : "PEN";
  const paymentMethod = currency === "PEN" ? "mercadopago" : "transfer";
  const hasTerms = Boolean(termsText || termsUrl);
  const quantity = withCompanion && !additionalTicket ? 2 : 1;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const totalPrice = resolvedPrice ? quoteTickets(resolvedPrice, quantity, offerRules, now, promotionExchangeRate) : null;
  const displayMoney = (amountPen: number) => formatMoney(currency === "EUR" ? Math.round(amountPen / resolvedPrice!.exchangeRate! * 100) / 100 : amountPen, currency);
  // Offer names can contain their configured currency; only show the buyer's currency.
  const offerLabel = totalPrice?.appliedOffer === "2x1" ? "2x1"
    : totalPrice?.appliedOffer?.endsWith("de descuento") ? "Descuento" : "Promoción";

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

  if (purchaseBlockedReason) return <div role="status" className="rounded-md border border-pink/40 bg-paper-sunk p-5 text-sm">
    <p>{purchaseBlockedReason}</p><Link href="/account" className="mt-3 inline-block font-semibold text-pink underline">Revisar mi cuenta</Link>
  </div>;
  const busy = pending || intent.state === "creating" || intent.state === "redirecting";

  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      if (busy || !acceptedTerms || !hasTerms || !totalPrice?.available || (additionalTicket && !allowCompanion)) return;
      startTransition(async () => {
        setIntent({ state: "creating" });
        try {
          const result = await createTicketIntent(eventId, needsCompanionNames ? { firstName, lastName } : undefined, { accepted: acceptedTerms, version: termsVersion, expectedAmountPen: totalPrice?.chargeAmountPen }, paymentMethod);
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
          {additionalTicket ? <p className="text-sm font-semibold">Ya tienes una entrada reservada o pagada. Comprar entrada para tu +1.</p> : <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" checked={withCompanion} onChange={(e) => setWithCompanion(e.target.checked)}
              disabled={spotsRemaining != null && spotsRemaining < 2} className="h-4 w-4 accent-pink" />
            Llevo un +1 (acompañante)
          </label>}
          <p className="text-xs text-ink/60">El +1 ocupa una entrada adicional. Las promociones y descuentos vigentes se reflejan en el total.</p>
          {resolvedPrice?.staffEntryAvailable !== undefined && <p className="text-xs text-ink/70">La tarifa de staff se aplica a una sola entrada por evento. Tu +1 paga la tarifa de extranjeros, convertida y cobrada en soles.</p>}
          {spotsRemaining != null && spotsRemaining < 2 && !additionalTicket && <p className="text-xs text-ink/60">Solo queda un cupo disponible.</p>}
          {needsCompanionNames && (
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
      {additionalTicket && !allowCompanion && <p role="status" className="text-sm text-ink/65">Ya tienes una entrada para este evento y el organizador no permite acompañantes.</p>}
      {totalPrice && !totalPrice.available && <p role="status" className="text-sm text-ink/65">El precio no está disponible temporalmente. Vuelve a intentarlo en unos minutos.</p>}
      {totalPrice?.available && (
        <div className="rounded-md border border-border bg-paper-sunk p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/70">
            Total ({quantity} {quantity === 1 ? "entrada" : "entradas"})
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink">
            {formatMoney(currency === "EUR" ? totalPrice.displayPriceEur! : totalPrice.chargeAmountPen, currency)}
          </p>
          {resolvedPrice?.staffEntryAvailable !== undefined && (
              <div className="mt-2 space-y-1 text-sm text-ink/70">
                <p>{additionalTicket ? "Entrada +1 (tarifa de extranjeros en soles)" : "Tu entrada (staff)"}: {formatMoney(resolvedPrice.chargeAmountPen, "PEN")}</p>
                {quantity === 2 && resolvedPrice.companionPricePen != null && <p>Entrada +1 (tarifa de extranjeros en soles): {formatMoney(resolvedPrice.companionPricePen, "PEN")}</p>}
                {totalPrice.savingsPen > 0 && <p>{offerLabel}: −{displayMoney(totalPrice.savingsPen)}</p>}
              </div>
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

      {totalPrice?.available && totalPrice.savingsPen > 0 && (
        <div className="rounded-md bg-paper-sunk p-4 text-sm" aria-live="polite">
          <p>Precio original: <span className="line-through">{displayMoney(totalPrice.subtotalPen)}</span></p>
          <p className="font-semibold text-pink">{offerLabel}: ahorras {displayMoney(totalPrice.savingsPen)}</p>
          <p className="mt-1 text-xs text-ink/60">Se aplica una sola oferta: la que deja el menor precio.</p>
        </div>
      )}

      {totalPrice && totalPrice.chargeAmountPen > 0 && <fieldset disabled={busy} className="space-y-3 rounded-md border border-border p-4">
        <legend className="px-2 text-sm font-semibold">Payment method / Medio de pago</legend>
        {paymentMethod === "transfer" ? <>
          <p className="text-sm font-semibold">Bank transfer / Transferencia (EUR)</p>
          <p className="text-xs text-ink/70">See bank details, transfer and upload your receipt. Your ticket is confirmed after administrator review.</p>
        </> : <p className="text-sm font-semibold">Card / Tarjeta — Mercado Pago</p>}
      </fieldset>}
      <button
        type="submit"
        disabled={busy || !resolvedPrice || !acceptedTerms || !hasTerms || !totalPrice?.available || (additionalTicket && !allowCompanion)}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-buddy px-6 py-3 font-display font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-60"
      >
        {intent.state === "redirecting" ? (
          totalPrice?.chargeAmountPen === 0 ? "Confirmando entradas…" : paymentMethod === "transfer" ? "Opening transfer details…" : "Taking you to Mercado Pago…"
        ) : intent.state === "creating" || pending ? (
          "Preparing checkout…"
        ) : (
          <>
            {totalPrice?.chargeAmountPen === 0 ? "Confirmar entradas sin pago" : "Continue to payment"}
            <ExternalLink size={16} />
          </>
        )}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-ink/70">
        <ShieldCheck size={14} />
        {totalPrice?.chargeAmountPen === 0 ? "No se requiere pago." : paymentMethod === "transfer" ? "Transfer receipts require administrator approval." : "Secured by Mercado Pago — your card details never touch our servers."}
      </p>

      {intent.state === "error" && (
        <p className="text-sm font-semibold text-error" role="alert">
          {intent.message}
        </p>
      )}
    </form>
  );
}
