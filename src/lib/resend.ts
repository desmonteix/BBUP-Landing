import "server-only";
import { Resend } from "resend";
import type { PromotionReference } from "@/lib/types";
import { formatEventDate, formatEventTime } from "@/lib/utils";
import { formatMoney } from "@/lib/pricing";

/**
 * Transactional email via Resend (spec §8). Requires RESEND_API_KEY — see
 * .env.example. Until the user supplies a real key this fails soft (logs
 * and returns without throwing) so RSVP/ticket flows never break because
 * an email couldn't be sent.
 */
function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("re_placeholder")) {
    console.warn("[resend] RESEND_API_KEY not configured — skipping email send.");
    return null;
  }
  return new Resend(key);
}

const FROM = process.env.RESEND_FROM_EMAIL || "Best Buddy UP! <onboarding@resend.dev>";

/**
 * Logs a rejection that the SDK reports by resolving rather than throwing.
 * The senders that return void would otherwise stay silent when Resend turns
 * a message away, which is how a buyer ends up with no receipt and nothing
 * anywhere saying why.
 */
function logIfRejected(label: string, error: { name: string; message: string } | null) {
  if (error) console.error(`[resend] ${label} rejected:`, error.name, error.message);
}

/**
 * Password reset link. Sent through Resend rather than Supabase's own mailer
 * so it matches the other transactional email and does not depend on the
 * project's SMTP settings.
 *
 * Returns whether Resend accepted the message. That matters more here than
 * anywhere else in this file: the email *is* the feature, and a reset the
 * sender never receives is indistinguishable, from their side, from an
 * address that was never registered. Note the token stays valid for its full
 * lifetime whether or not delivery worked — nothing here revokes it.
 *
 * `resetUrl` carries a live credential, so no part of it is ever logged.
 */
export async function sendPasswordReset(params: {
  to: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    console.error("[resend] no API key configured — password reset not sent");
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: "Reset your Best Buddy UP! password",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h1 style="color:#241A2E;">Set a new password</h1>
          <p>Use the button below to choose a new password for your Best Buddy UP! account.</p>
          <p style="margin:28px 0;">
            <a href="${escapeHtml(params.resetUrl)}"
               style="background:#E23A82; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:999px; font-weight:600; display:inline-block;">
              Choose a new password
            </a>
          </p>
          <p style="font-size:14px; color:#666;">
            This link works once and expires in about ${params.expiresInMinutes} minutes.
          </p>
          <p style="font-size:14px; color:#666;">
            If you didn't ask for this, you can ignore this email — your password stays as it is.
          </p>
          <p style="margin-top:24px; color:#666;">— Best Buddy UP!</p>
        </div>
      `,
    });

    // The SDK resolves rather than throws on API errors (CreateEmailResponse
    // is `{data, error: null} | {data: null, error}`), so an invalid key, an
    // unverified sender or a 429 all land here looking like success unless
    // `error` is read. The default sender `onboarding@resend.dev` only
    // delivers to the Resend account owner, which makes this the likely path
    // in any environment where RESEND_FROM_EMAIL was never set.
    if (error) {
      console.error("[resend] sendPasswordReset rejected:", error.name, error.message);
      return false;
    }

    return true;
  } catch (err) {
    // Transport-level only (network, abort, timeout, bad payload);
    // API rejections come back as `error` above.
    // Deliberately logs no part of the URL.
    console.error("[resend] sendPasswordReset failed", err);
    return false;
  }
}

export async function sendRsvpConfirmation(params: {
  to: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  location: string;
}) {
  const resend = getResendClient();
  if (!resend) return;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `You're on the list — ${params.eventTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h1 style="color:#241A2E;">See you there, ${escapeHtml(params.name)}! 👋</h1>
          <p>Your spot for <strong>${escapeHtml(params.eventTitle)}</strong> is confirmed.</p>
          <table style="margin-top:16px; font-size:14px; color:#241A2E;">
            <tr><td style="padding:4px 12px 4px 0; color:#8a8a93;">Date</td><td>${formatEventDate(params.eventDate)} · ${formatEventTime(params.eventDate)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0; color:#8a8a93;">Location</td><td>${escapeHtml(params.location)}</td></tr>
          </table>
          <p style="margin-top:24px; color:#666;">— Best Buddy UP!</p>
        </div>
      `,
    });
    logIfRejected("sendRsvpConfirmation", error);
  } catch (err) {
    console.error("[resend] sendRsvpConfirmation failed", err);
  }
}

export async function sendTicketReceipt(params: {
  to: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  location: string;
  /** What Mercado Pago actually charged — always PEN (spec §3/§4). */
  amountPen: number;
  /** Set only for exchange-student tickets: the USD figure they were
   * shown before conversion, kept here purely so the receipt's math is
   * legible even though PEN is what was charged. */
  displayPriceUsd: number | null;
  /** The USD -> PEN rate used at charge time, for the same reason. */
  exchangeRateApplied: number | null;
  paymentId: string;
  ticketQuantity?: number;
  companionName?: string | null;
  promotionReference?: PromotionReference | null;
}) {
  const resend = getResendClient();
  if (!resend) return;

  const usdLine =
    params.displayPriceUsd != null && params.exchangeRateApplied != null
      ? `<tr><td style="padding:4px 12px 4px 0; color:#8a8a93;">Reference price</td><td>${formatMoney(params.displayPriceUsd, "USD")} at S/ ${params.exchangeRateApplied.toFixed(3)} per US$</td></tr>`
      : "";

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `Your ticket — ${params.eventTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h1 style="color:#241A2E;">You're in, ${escapeHtml(params.name)}! 🎟️</h1>
          <p>Your ticket for <strong>${escapeHtml(params.eventTitle)}</strong> is confirmed.</p>
          <table style="margin-top:16px; font-size:14px; color:#241A2E;">
            <tr><td style="padding:4px 12px 4px 0; color:#8a8a93;">Date</td><td>${formatEventDate(params.eventDate)} · ${formatEventTime(params.eventDate)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0; color:#8a8a93;">Location</td><td>${escapeHtml(params.location)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0; color:#8a8a93;">Amount charged</td><td>${formatMoney(params.amountPen, "PEN")}</td></tr>
            <tr><td>Tickets</td><td>${params.ticketQuantity ?? 1}</td></tr>
            ${params.companionName ? `<tr><td>+1</td><td>${escapeHtml(params.companionName)}</td></tr>` : ""}
            ${params.promotionReference ? `<tr><td>Package price</td><td>${formatMoney(params.promotionReference.amount, params.promotionReference.currency)} at S/ ${params.promotionReference.rate.toFixed(4)} per ${escapeHtml(params.promotionReference.currency)} (${escapeHtml(params.promotionReference.source)}, ${escapeHtml(params.promotionReference.date)})</td></tr>` : ""}
            ${usdLine}
            <tr><td style="padding:4px 12px 4px 0; color:#8a8a93;">Payment ID</td><td>${escapeHtml(params.paymentId)}</td></tr>
          </table>
          <p style="margin-top:24px; color:#666;">— Best Buddy UP!</p>
        </div>
      `,
    });
    logIfRejected("sendTicketReceipt", error);
  } catch (err) {
    console.error("[resend] sendTicketReceipt failed", err);
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
