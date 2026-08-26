import "server-only";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

/**
 * Server-side Mercado Pago Checkout Pro client (spec §3, §10). Card data
 * never reaches this file — it creates a "preference" (a description of
 * what's being sold), Mercado Pago hosts the actual payment page
 * (`init_point`), and we only ever read back a payment's status by id
 * (webhook-driven, see src/app/api/mercadopago/webhook/route.ts).
 *
 * Verified directly against the installed `mercadopago` npm SDK's type
 * definitions (node_modules/mercadopago/dist/clients/preference/commonTypes.d.ts,
 * .../payment/commonTypes.d.ts, .../utils/webhook/index.d.ts) rather than
 * guessed — see also the webhook route for the signature-verification call.
 */

function getClient(): MercadoPagoConfig {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN is not configured.");
  }
  return new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
}

export interface CreatePreferenceParams {
  registrationId: string;
  eventTitle: string;
  amountPen: number;
  payerEmail: string;
  payerFirstName: string;
  payerLastName: string;
  siteUrl: string;
}

export interface CreatePreferenceResult {
  ok: true;
  initPoint: string;
  preferenceId: string;
}

export interface CreatePreferenceError {
  ok: false;
  error: string;
}

export async function createPaymentPreference(
  params: CreatePreferenceParams
): Promise<CreatePreferenceResult | CreatePreferenceError> {
  try {
    const client = getClient();
    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        items: [
          {
            id: params.registrationId,
            title: `Best Buddy UP! — ${params.eventTitle}`,
            quantity: 1,
            currency_id: "PEN",
            unit_price: params.amountPen,
          },
        ],
        payer: {
          name: params.payerFirstName,
          surname: params.payerLastName,
          email: params.payerEmail,
        },
        external_reference: params.registrationId,
        notification_url: `${params.siteUrl}/api/mercadopago/webhook`,
        back_urls: {
          success: `${params.siteUrl}/checkout/return?registration_id=${params.registrationId}`,
          pending: `${params.siteUrl}/checkout/return?registration_id=${params.registrationId}`,
          failure: `${params.siteUrl}/checkout/return?registration_id=${params.registrationId}`,
        },
        auto_return: "approved",
        binary_mode: true,
        statement_descriptor: "BESTBUDDYUP",
      },
    });

    const initPoint = response.init_point ?? response.sandbox_init_point;
    if (!initPoint || !response.id) {
      return { ok: false, error: "Mercado Pago did not return a checkout URL." };
    }

    return { ok: true, initPoint, preferenceId: response.id };
  } catch (err) {
    console.error("[mercadopago] createPaymentPreference failed", err);
    return { ok: false, error: "Could not start the payment. Try again in a moment." };
  }
}

export interface MercadoPagoPaymentInfo {
  id: string;
  status: string | undefined;
  externalReference: string | undefined;
  transactionAmount: number | undefined;
}

export async function getMercadoPagoPayment(
  paymentId: string | number
): Promise<MercadoPagoPaymentInfo | null> {
  try {
    const client = getClient();
    const payment = new Payment(client);
    const response = await payment.get({ id: paymentId });

    if (response.id == null) return null;

    return {
      id: String(response.id),
      status: response.status,
      externalReference: response.external_reference,
      transactionAmount: response.transaction_amount,
    };
  } catch (err) {
    console.error("[mercadopago] getMercadoPagoPayment failed", err);
    return null;
  }
}

/** Resolves the site's own absolute base URL for back_urls/notification_url. */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
