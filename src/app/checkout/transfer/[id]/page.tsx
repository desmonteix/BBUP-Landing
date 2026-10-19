import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentExchangeRate } from "@/lib/exchangeRate";
import { effectiveRateFor } from "@/lib/pricing";
import { transferAccounts, transferEuroAmount } from "@/lib/transfer";
import { receiptsConfigured } from "@/lib/cloudinary";
import { ReceiptUpload } from "@/components/events/ReceiptUpload";
import { formatMoney } from "@/lib/money";
import { z } from "zod";

export const dynamic = "force-dynamic";
export default async function TransferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?redirect=${encodeURIComponent(`/checkout/transfer/${id}`)}`);
  const db = await createClient();
  const { data: r, error } = await db.from("registrations").select("id, name, amount_pen, display_price_eur, payment_status, ticket_quantity, events(title)").eq("id", id).eq("profile_id", profile.id).eq("kind", "ticket").maybeSingle();
  if (error) throw new Error("Could not load reservation.");
  if (!r) notFound();
  const { data: receipts, error: receiptError } = await db.from("payment_receipts").select("id, status, currency, created_at").eq("registration_id", id).order("created_at", { ascending: false });
  if (receiptError) throw new Error("Could not load receipts.");
  const active = receipts?.some(receipt => receipt.status !== "rejected");
  let euro = transferEuroAmount(r.display_price_eur);
  // Store the EUR quote before presenting it, so the upload API and reviewer
  // validate exactly the amount the buyer saw, even if rates change later.
  if (euro == null && r.payment_status === "pending") {
    const currentRate = await getCurrentExchangeRate();
    const rate = currentRate ? effectiveRateFor(currentRate) : null;
    const converted = transferEuroAmount(null, r.amount_pen, rate);
    if (converted != null) {
      const { data: saved, error: quoteError } = await createAdminClient().from("registrations")
        .update({ display_price_eur: converted, exchange_rate_applied: rate })
        .eq("id", r.id).eq("profile_id", profile.id).eq("payment_status", "pending")
        .is("display_price_eur", null).select("display_price_eur").maybeSingle();
      if (quoteError) console.error("[transfers] could not store EUR quote");
      if (saved) euro = transferEuroAmount(saved.display_price_eur);
      else if (!quoteError) {
        const { data: latest } = await db.from("registrations").select("display_price_eur").eq("id", r.id).eq("profile_id", profile.id).maybeSingle();
        euro = transferEuroAmount(latest?.display_price_eur ?? null);
      }
    }
  }
  const event = Array.isArray(r.events) ? r.events[0] : r.events;
  return <section className="mx-auto max-w-2xl space-y-6 px-5 py-12">
    <Link href="/account" className="text-sm text-pink underline">My tickets / Mis entradas</Link>
    <h1 className="font-display text-3xl font-semibold">Bank transfer / Transferencia</h1>
    <p>{event?.title} · {r.ticket_quantity} ticket(s) · {r.name}</p>
    <p className="break-all text-sm">Payment reference / Referencia: <strong>{r.id}</strong></p>
    {r.payment_status === "paid" ? <p role="status">Payment confirmed / Pago confirmado.</p> : r.payment_status !== "pending" ? <p role="status">This payment attempt has ended. Create a new reservation and choose bank transfer. / Este intento finalizó. <Link href="/events" className="text-pink underline">Crear una nueva reserva por transferencia</Link>.</p> : <>
      <p className="text-sm">Choose one account and transfer the corresponding amount. Include the reference above in the transfer description. / Elige una cuenta e incluye la referencia en el concepto.</p>
      <div className="rounded-md border border-border bg-white p-5 text-sm space-y-2">
        <h2 className="font-display text-xl font-semibold">PEN — {formatMoney(r.amount_pen ?? 0, "PEN")}</h2>
        <p>Bank / Banco: {transferAccounts.PEN.bank} — soles</p>
        <p>Account holder / Titular: {transferAccounts.PEN.holder}</p>
        <p className="break-all">Account / Cuenta: <strong>{transferAccounts.PEN.account}</strong></p>
        <p className="break-all">CCI: <strong>{transferAccounts.PEN.cci}</strong></p>
      </div>
      <div className="rounded-md border border-border bg-white p-5 text-sm space-y-2">
        <h2 className="font-display text-xl font-semibold">EUR — Santander {euro != null && `— ${formatMoney(euro, "EUR")}`}</h2>
        <p>Account Name / Titular: {transferAccounts.EUR.holder}</p>
        <p className="break-words">IBAN: <strong>{transferAccounts.EUR.iban}</strong></p>
        <p>SWIFT (BIC): <strong>{transferAccounts.EUR.bic}</strong></p>
        <p>Address / Dirección: {transferAccounts.EUR.address}</p>
        {euro == null && <p>The EUR exchange rate is temporarily unavailable. / El tipo de cambio para Santander EUR no está disponible temporalmente.</p>}
      </div>
      <p className="text-sm text-ink/70">Transfer the full quoted amount; your bank may charge separate fees. / Transfiere el importe completo indicado; tu banco puede cobrar comisiones adicionales.</p>
      {active ? <p role="status" className="rounded border border-border p-4">Receipt submitted — pending review. / Comprobante enviado, pendiente de revisión. Your ticket is not confirmed yet.</p> : <ReceiptUpload registrationId={r.id} euroAvailable={euro != null} uploadsEnabled={receiptsConfigured()} />}
    </>}
    {!!receipts?.length && <div className="space-y-2"><h2 className="font-semibold">Receipts / Comprobantes</h2>{receipts.map(receipt => <p key={receipt.id} className="text-sm">{receipt.currency} · {receipt.status === "pending" ? "Pending review / Pendiente" : receipt.status === "approved" ? "Approved / Aprobado" : "Rejected — check the bank deposit and send a corrected receipt / Rechazado: revisa el ingreso y adjunta el comprobante correcto"} · <a href={`/api/transfers/receipts/${receipt.id}`} target="_blank" rel="noreferrer" className="text-pink underline">View / Ver</a></p>)}</div>}
  </section>;
}
