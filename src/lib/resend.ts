import "server-only";
import { Resend } from "resend";
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
    await resend.emails.send({
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
  amount: number;
  currency: "PEN" | "USD";
  chargeId: string;
}) {
  const resend = getResendClient();
  if (!resend) return;

  try {
    await resend.emails.send({
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
            <tr><td style="padding:4px 12px 4px 0; color:#8a8a93;">Amount paid</td><td>${formatMoney(params.amount, params.currency)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0; color:#8a8a93;">Receipt ID</td><td>${escapeHtml(params.chargeId)}</td></tr>
          </table>
          <p style="margin-top:24px; color:#666;">— Best Buddy UP!</p>
        </div>
      `,
    });
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
