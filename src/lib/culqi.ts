import "server-only";
import { toCulqiAmount } from "@/lib/pricing";

/**
 * Server-side Culqi Charges API client. Card data never reaches this file —
 * it only ever receives the short-lived `token.id` produced by the Culqi
 * Checkout widget in the browser (see components/events/CulqiCheckoutButton.tsx),
 * exchanges it for a charge using the SECRET key (server env only), and
 * returns the result.
 *
 * // VERIFICAR: confirm the current Charges API request/response shape
 * // against https://apidocs.culqi.com/ before going live — Culqi's API
 * // has had v2/v3 revisions and this is built from the documented request
 * // shape as of this project's spec, using TEST/sandbox keys.
 */

const CULQI_API_BASE = "https://api.culqi.com/v2";

export interface CulqiChargeResult {
  ok: boolean;
  chargeId?: string;
  errorMessage?: string;
}

export async function createCulqiCharge(params: {
  tokenId: string;
  amount: number; // in the currency's major unit (e.g. 45.00)
  currency: "PEN" | "USD";
  email: string;
  description: string;
}): Promise<CulqiChargeResult> {
  const secretKey = process.env.CULQI_SECRET_KEY;
  if (!secretKey) {
    console.error("[culqi] CULQI_SECRET_KEY not configured");
    return { ok: false, errorMessage: "Payments are not configured yet." };
  }

  try {
    const res = await fetch(`${CULQI_API_BASE}/charges`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        amount: toCulqiAmount(params.amount),
        currency_code: params.currency,
        email: params.email,
        source_id: params.tokenId,
        description: params.description,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[culqi] charge failed", data);
      return {
        ok: false,
        errorMessage: data?.user_message || data?.merchant_message || "Payment failed.",
      };
    }

    return { ok: true, chargeId: data.id as string };
  } catch (err) {
    console.error("[culqi] charge request threw", err);
    return { ok: false, errorMessage: "Could not reach the payment provider." };
  }
}
