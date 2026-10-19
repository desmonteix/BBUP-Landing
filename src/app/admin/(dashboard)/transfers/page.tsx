import Link from "next/link";
import Image from "next/image";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reviewTransfer } from "@/lib/actions/transfers";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";
export default async function TransfersPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; history?: string }> }) {
  await requireAdmin();
  const search = await searchParams;
  const db = await createClient();
  let query = db.from("payment_receipts").select("id, status, currency, created_at, registration_id, registrations(name, email, amount_pen, display_price_eur, event_id, payment_status, events(title))").order("created_at", { ascending: false }).limit(200);
  if (search.history !== "1") query = query.eq("status", "pending");
  const { data, error } = await query;
  if (error) throw new Error("Could not load transfer receipts.");
  return <div className="mx-auto max-w-3xl space-y-5">
    <h1 className="font-display text-3xl font-semibold">Aprobar entradas por transferencia</h1>
    <nav aria-label="Revisión de entradas" className="flex flex-wrap gap-4 text-sm font-semibold text-pink"><Link href="/admin">Panel principal</Link><Link href="/admin/transfers">Pendientes de aprobación</Link><Link href="/admin/transfers?history=1">Historial de comprobantes</Link></nav>
    <p className="text-sm">Comprueba el ingreso y el importe en la cuenta bancaria antes de aprobar. Una captura no demuestra por sí sola que el dinero llegó. Se muestran los últimos 200 comprobantes.</p>
    {search.error && <p role="alert">No se pudo guardar. Recarga: el pago o comprobante puede haber cambiado.</p>}
    {search.saved && <p role="status">Revisión guardada. Si aprobaste el comprobante, la entrada ya figura como pagada en el evento y en la cuenta del comprador.</p>}
    {!data?.length && <p>No hay comprobantes.</p>}
    {data?.map(receipt => {
      const r = Array.isArray(receipt.registrations) ? receipt.registrations[0] : receipt.registrations;
      const event = r && (Array.isArray(r.events) ? r.events[0] : r.events);
      return <article key={receipt.id} className="space-y-3 rounded border border-border bg-white p-5 text-sm">
        <p className="font-semibold">{r?.name} · {r?.email}</p>
        <Link className="text-pink underline" href={`/admin/events/${r?.event_id}`}>{event?.title}</Link>
        <p className="break-all">Referencia: {receipt.registration_id}</p>
        <p>Importe a verificar: {formatMoney(receipt.currency === "EUR" ? r?.display_price_eur ?? 0 : r?.amount_pen ?? 0, receipt.currency === "EUR" ? "EUR" : "PEN")}</p>
        <p>Comprobante: {receipt.status === "pending" ? "Pendiente de aprobación" : receipt.status === "approved" ? "Aprobado" : "Rechazado"} · Entrada: {r?.payment_status === "paid" ? "Compra confirmada" : "Sin confirmar"}</p>
        <Image src={`/api/transfers/receipts/${receipt.id}`} alt={`Comprobante de transferencia de ${r?.name ?? "comprador"}`} width={900} height={1200} unoptimized className="max-h-96 w-full rounded border border-border bg-paper-sunk object-contain" />
        <a href={`/api/transfers/receipts/${receipt.id}`} target="_blank" rel="noreferrer" className="inline-block font-semibold text-pink underline">Ver comprobante</a>
        {receipt.status === "pending" && <form action={reviewTransfer} className="flex flex-wrap gap-3">
          <input type="hidden" name="receiptId" value={receipt.id} />
          <button name="decision" value="approved" className="rounded-full bg-ink px-4 py-2 text-white">Ingreso verificado: aprobar entrada</button>
          <button name="decision" value="rejected" className="rounded-full border border-border px-4 py-2">Rechazar comprobante</button>
        </form>}
      </article>;
    })}
  </div>;
}
