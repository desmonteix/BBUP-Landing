import "server-only";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

/**
 * Server-side Mercado Pago Checkout Pro client (spec §3, §10). Card data
 * never reaches this file — it creates a "preference" (a description of
 * what's being sold), Mercado Pago hosts the actual payment page
 * (`init_point`), and all this module ever reads back is a payment's
 * status: by id for the webhook, or by `external_reference` when the
 * return page has to recover a payment whose notification never arrived.
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

/** The fields of a search hit this module reads. */
export interface PaymentSearchHit {
  id?: string;
  status?: string;
  external_reference?: string;
  date_created?: string;
  transaction_amount?: number;
  currency_id?: string;
}

/**
 * Picks which payment decides a registration. Separate from the API call so
 * it can be tested without a Mercado Pago account.
 *
 * Hits for another `external_reference` are dropped rather than trusted: the
 * caller writes to whatever reference comes back, so a filter that silently
 * stopped applying would settle a different buyer's ticket.
 *
 * An approved payment wins — a retry that eventually succeeded is the
 * outcome. Otherwise the newest wins, being the attempt the buyer waits on.
 * Equal timestamps fall back to the id so the choice never depends on the
 * order the API happened to return (Array#sort is stable, so without that
 * tiebreak the input order would decide).
 */
export function selectPaymentForRegistration(
  results: PaymentSearchHit[],
  registrationId: string
): MercadoPagoPaymentInfo | null {
  const mine = results
    .filter((r) => r.id != null && r.external_reference === registrationId)
    .sort((a, b) => {
      const byNewest = (b.date_created ?? "").localeCompare(a.date_created ?? "");
      return byNewest !== 0 ? byNewest : String(b.id).localeCompare(String(a.id));
    });

  const chosen = mine.find((r) => r.status === "approved") ?? mine[0];
  if (!chosen) return null;

  return {
    id: String(chosen.id),
    status: chosen.status,
    externalReference: chosen.external_reference,
    transactionAmount: chosen.transaction_amount,
    ...(chosen.currency_id ? { currencyId: chosen.currency_id } : {}),
  };
}

/**
 * Finds the payment for a registration, for when the webhook never arrived —
 * a notification can be lost, rejected on a stale signature, or still in
 * flight while the buyer already sits on the return page.
 *
 * Sorted newest-first explicitly: the API's default order is unspecified, so
 * a buyer who retried more than `limit` times could otherwise get an
 * arbitrary page of attempts that omits the one that succeeded.
 *
 * Query shape verified against the installed SDK's types
 * (node_modules/mercadopago/dist/clients/payment/search/types.d.ts), where
 * `PaymentSearchOptions` declares `external_reference`, `sort` and
 * `criteria` as explicit typed fields.
 */
export type PaymentLookupResult = { ok: true; payment: MercadoPagoPaymentInfo | null } | { ok: false; error: string };

export async function lookupPaymentByRegistration(
  registrationId: string
): Promise<PaymentLookupResult> {
  try {
    const client = getClient();
    const payment = new Payment(client);
    const response = await payment.search({
      options: {
        external_reference: registrationId,
        sort: "date_created",
        criteria: "desc",
        limit: 20,
      },
    });

    return { ok: true, payment: selectPaymentForRegistration(response.results ?? [], registrationId) };
  } catch (err) {
    // The recovery path going quiet is itself worth seeing in the logs: this
    // is the only thing that settles a payment when the webhook does not.
    const status = typeof err === "object" && err !== null && "status" in err ? err.status : undefined;
    console.error("[mercadopago] payment lookup failed", { status });
    return { ok: false, error: status === 401 || status === 403
      ? "Credenciales de Mercado Pago no válidas. No se pudieron verificar los pagos."
      : "No se pudo consultar Mercado Pago. Vuelve a intentarlo; el estado no se ha cambiado." };
  }
}

export async function findPaymentByRegistration(registrationId: string): Promise<MercadoPagoPaymentInfo | null> {
  const result = await lookupPaymentByRegistration(registrationId);
  return result.ok ? result.payment : null;
}

export interface MercadoPagoPaymentInfo {
  id: string;
  status: string | undefined;
  externalReference: string | undefined;
  transactionAmount: number | undefined;
  currencyId?: string;
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
      currencyId: response.currency_id,
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
