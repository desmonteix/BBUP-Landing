"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { formatMoney } from "@/lib/pricing";

declare global {
  interface Window {
    Culqi?: {
      publicKey: string;
      settings: (opts: Record<string, unknown>) => void;
      options: (opts: Record<string, unknown>) => void;
      open: () => void;
      close: () => void;
      token?: { id: string };
      order?: unknown;
      error?: { user_message?: string; merchant_message?: string };
    };
    culqi?: () => void;
  }
}

const CULQI_SCRIPT_SRC = "https://checkout.culqi.com/js/v4";

function loadCulqiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Culqi) return resolve();
    const existing = document.querySelector(`script[src="${CULQI_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = CULQI_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment widget."));
    document.body.appendChild(script);
  });
}

/**
 * Opens Culqi's hosted Checkout widget (spec §3) — card details are typed
 * into Culqi's own iframe, never our DOM, and never reach our server. On
 * success, Culqi calls the required global `window.culqi()` callback with
 * `Culqi.token.id` set; we hand that token (not card data) to our server
 * at /api/culqi/charge to create the actual charge.
 *
 * // VERIFICAR: Culqi Checkout v4 config keys/callback contract against
 * // https://apidocs.culqi.com/ — implemented from the documented flow at
 * // spec time; re-verify before switching from sandbox to live keys.
 */
export function CulqiCheckoutButton({
  publicKey,
  amount,
  currency,
  email,
  eventTitle,
  registrationId,
  onSuccess,
  onError,
}: {
  publicKey: string;
  amount: number;
  currency: "PEN" | "USD";
  email: string;
  eventTitle: string;
  registrationId: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "charging">("idle");

  async function handleClick() {
    setStatus("loading");
    try {
      await loadCulqiScript();
      const Culqi = window.Culqi;
      if (!Culqi) throw new Error("Payment widget failed to load.");

      Culqi.publicKey = publicKey;
      Culqi.settings({
        title: "Best Buddy UP!",
        currency,
        amount: Math.round(amount * 100),
        description: eventTitle,
        order: registrationId,
      });
      Culqi.options({
        lang: "en",
        installments: false,
        paymentMethods: {
          tarjeta: true,
          yape: currency === "PEN",
          bancaMovil: false,
          agente: false,
          billetera: false,
          cuotealo: false,
        },
        style: {
          logo: "/LOGO%20BBUP%20COLOR.png",
          bannerColor: "E23A82",
          buttonBackground: "241A2E",
          menuColor: "241A2E",
          linksColor: "E23A82",
          buttonText: "Pay now",
          buttonTextColor: "ffffff",
          priceColor: "241A2E",
        },
      });

      window.culqi = async function culqiCallback() {
        if (!Culqi) return;
        if (Culqi.token) {
          setStatus("charging");
          try {
            const res = await fetch("/api/culqi/charge", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                registrationId,
                culqiTokenId: Culqi.token.id,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Payment failed.");
            Culqi.close();
            setStatus("idle");
            onSuccess();
          } catch (err) {
            setStatus("idle");
            onError(err instanceof Error ? err.message : "Payment failed.");
          }
        } else if (Culqi.error) {
          setStatus("idle");
          onError(Culqi.error.user_message ?? "The card was declined.");
        }
      };

      Culqi.open();
      setStatus("idle");
    } catch (err) {
      setStatus("idle");
      onError(err instanceof Error ? err.message : "Could not open the payment widget.");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={status !== "idle"}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-buddy px-6 py-3 font-display font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-60"
      >
        {status !== "idle" && <Loader2 size={18} className="animate-spin" />}
        Pay {formatMoney(amount, currency)}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink/45">
        <ShieldCheck size={14} />
        Secured by Culqi — your card details never touch our servers.
      </p>
    </div>
  );
}
