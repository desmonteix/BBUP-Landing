"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, LogIn } from "lucide-react";
import { createTicketIntent } from "@/lib/actions/registrations";
import { CulqiCheckoutButton } from "@/components/events/CulqiCheckoutButton";
import { formatMoney } from "@/lib/pricing";
import type { ResolvedPrice } from "@/lib/types";

type Intent =
  | { state: "idle" }
  | { state: "creating" }
  | {
      state: "ready";
      registrationId: string;
      amount: number;
      currency: "PEN" | "USD";
      email: string;
      culqiPublicKey: string;
      eventTitle: string;
    }
  | { state: "paid" }
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
        <p className="mt-3 text-xs text-ink/50">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-pink hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    );
  }

  if (intent.state === "paid") {
    return (
      <div className="flex items-start gap-3 rounded-md bg-success/10 p-5" role="status">
        <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={22} />
        <div>
          <p className="font-display font-semibold text-success">Ticket confirmed!</p>
          <p className="mt-1 text-sm text-ink/70">
            Check your email for the receipt and event details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {resolvedPrice && (
        <div className="rounded-md border border-border bg-paper-sunk p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
            Your price
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink">
            {formatMoney(resolvedPrice.amount, resolvedPrice.currency)}
          </p>
          <p className="mt-1 text-xs text-ink/50">
            Priced in {resolvedPrice.currency === "PEN" ? "soles" : "US dollars"} based on your
            profile.
          </p>
        </div>
      )}

      {intent.state === "ready" ? (
        <CulqiCheckoutButton
          publicKey={intent.culqiPublicKey}
          amount={intent.amount}
          currency={intent.currency}
          email={intent.email}
          eventTitle={intent.eventTitle}
          registrationId={intent.registrationId}
          onSuccess={() => setIntent({ state: "paid" })}
          onError={(message) => setIntent({ state: "error", message })}
        />
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setIntent({ state: "creating" });
              const result = await createTicketIntent(eventId);
              if (!result.ok) {
                setIntent({ state: "error", message: result.error });
                return;
              }
              setIntent({ state: "ready", ...result });
            })
          }
          className="w-full cursor-pointer rounded-full bg-gradient-buddy px-6 py-3 font-display font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-60"
        >
          {pending || intent.state === "creating" ? "Preparing checkout…" : "Continue to payment"}
        </button>
      )}

      {intent.state === "error" && (
        <p className="text-sm font-semibold text-error" role="alert">
          {intent.message}
        </p>
      )}
    </div>
  );
}
