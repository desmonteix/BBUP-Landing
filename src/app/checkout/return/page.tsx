import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findPaymentByRegistration } from "@/lib/mercadopago";
import { applyPaymentToRegistration } from "@/lib/db/payments";
import { formatMoney } from "@/lib/money";
import { LinkButton } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export const metadata = { title: "Payment status" };
export const dynamic = "force-dynamic";

/**
 * Landing page after Mercado Pago's hosted Checkout Pro redirects the buyer
 * back (spec §5 — Checkout Pro is a redirect-based hosted page, unlike the
 * embedded-modal flow the earlier Culqi integration used, so there has to
 * be *somewhere* for the buyer to land). The query params Mercado Pago
 * appends (`status`, `payment_id`, etc.) are NOT trusted as proof of
 * payment — nothing the buyer's browser carries decides anything here.
 *
 * While the registration is not yet paid, this page asks Mercado Pago's API
 * directly what happened to it and settles it through the same code the
 * webhook uses. The webhook is still the normal path; this is the fallback
 * for when a notification is lost, rejected on a mismatched signature, or
 * simply slower than the redirect. Without it a lost notification means the
 * buyer is charged and never gets a ticket, and the only record of the sale
 * lives on Mercado Pago's side.
 *
 * PII guard: only shows event/amount details if the logged-in viewer owns
 * the registration — otherwise (no session, or someone else's link) shows
 * a generic message so a guessed `registration_id` can't leak another
 * buyer's name/email/amount.
 */
export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ registration_id?: string }>;
}) {
  const { registration_id: registrationId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let owned = false;
  let registration: {
    payment_status: string;
    amount_pen: number | null;
    display_price_eur: number | null;
  } | null = null;
  let eventTitle: string | null = null;

  if (registrationId && user) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("registrations")
      .select("payment_status, amount_pen, display_price_eur, profile_id, event_id")
      .eq("id", registrationId)
      .maybeSingle();

    if (data && data.profile_id === user.id) {
      owned = true;
      registration = data;

      // `failed` is re-checked too, not just `pending`: a buyer whose first
      // attempt was rejected can retry and succeed, and freezing that row
      // would leave the page telling someone who was charged that no charge
      // was made. Free RSVPs ("n/a") have no payment to look up.
      const settleable = data.payment_status === "pending" || data.payment_status === "failed";

      if (settleable) {
        const payment = await findPaymentByRegistration(registrationId);
        if (payment) {
          try {
            await applyPaymentToRegistration(payment);
            const { data: settled, error: rereadError } = await admin
              .from("registrations")
              .select("payment_status, amount_pen, display_price_eur")
              .eq("id", registrationId)
              .maybeSingle();
            if (rereadError) {
              console.error("[checkout/return] settled but could not re-read", rereadError);
            }
            if (settled) registration = settled;
          } catch (err) {
            // Show the status we already have rather than an error page: the
            // buyer can do nothing about a failed write, and a reload or a
            // late notification settles it.
            console.error("[checkout/return] could not settle payment", err);
          }
        }
      }

      const { data: event } = await admin
        .from("events")
        .select("title")
        .eq("id", data.event_id)
        .maybeSingle();
      eventTitle = event?.title ?? null;
    }
  }

  return (
    <section className="flex min-h-[70vh] items-center justify-center px-5 py-16 sm:px-8">
      <Container className="max-w-md text-center">
        {owned && registration?.payment_status === "paid" ? (
          <>
            <CheckCircle2 className="mx-auto text-success" size={48} />
            <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
              You&rsquo;re in{eventTitle ? ` for ${eventTitle}` : ""}!
            </h1>
            <p className="mt-2 text-sm text-ink/65">
              {registration.amount_pen != null &&
                `${formatMoney(registration.amount_pen, "PEN")} charged. `}
              A receipt is on its way to your email.
            </p>
          </>
        ) : owned && registration?.payment_status === "failed" ? (
          <>
            <XCircle className="mx-auto text-error" size={48} />
            <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
              That payment didn&rsquo;t go through
            </h1>
            <p className="mt-2 text-sm text-ink/65">
              No charge was made. Head back to the event and try again — a different card
              sometimes does the trick.
            </p>
          </>
        ) : (
          <>
            <Clock className="mx-auto text-pink" size={48} />
            <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
              Confirming your payment…
            </h1>
            <p className="mt-2 text-sm text-ink/65">
              Mercado Pago is finishing up. This can take a minute — we&rsquo;ll email your
              receipt as soon as it&rsquo;s confirmed. You can also check your ticket status from
              your account.
            </p>
          </>
        )}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <LinkButton href="/events" variant="secondary">
            Back to events
          </LinkButton>
          <LinkButton href="/account">View my account</LinkButton>
        </div>

        {!user && (
          <p className="mt-4 text-xs text-ink/45">
            <Link href="/login?redirect=/account" className="font-semibold text-pink hover:underline">
              Log in
            </Link>{" "}
            to see this ticket&rsquo;s status.
          </p>
        )}
      </Container>
    </section>
  );
}
