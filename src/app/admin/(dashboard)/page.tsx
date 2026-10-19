import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Plus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEventDate } from "@/lib/utils";
import { getCurrentExchangeRate, isExchangeRateStale } from "@/lib/exchangeRate";
import { BCRP_RATE_MARKUP, effectiveRateFor } from "@/lib/pricing";
import { CategoryBadge } from "@/components/events/CategoryBadge";
import { ExchangeRatePanel } from "@/components/admin/ExchangeRatePanel";
import { Badge } from "@/components/ui/Badge";
import type { EventRow } from "@/lib/types";

export const metadata = { title: "Admin — Events" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const [{ data: events }, { data: regCounts }, currentRate, receiptQueue] = await Promise.all([
    admin
      .from("events")
      .select("id, slug, title, event_date, type, status, category, capacity")
      .order("event_date", { ascending: false }),
    admin
      .from("registrations")
      .select("event_id, ticket_quantity")
      .in("payment_status", ["n/a", "pending", "paid"]),
    getCurrentExchangeRate(),
    admin.from("payment_receipts").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const counts = new Map<string, number>();
  for (const r of regCounts ?? []) {
    counts.set(r.event_id, (counts.get(r.event_id) ?? 0) + r.ticket_quantity);
  }

  return (
    <div>
      {/* `pricing` is server-only, so the effective rate is resolved here and
          handed down rather than recomputed inside the client component. */}
      <ExchangeRatePanel
        rate={
          currentRate
            ? {
                current: currentRate,
                chargedRate: effectiveRateFor(currentRate),
                markup: BCRP_RATE_MARKUP,
                isStale: isExchangeRateStale(currentRate),
              }
            : null
        }
      />

      <Link href="/admin/approvals" className="mt-6 inline-flex rounded-md border border-border bg-white px-5 py-3 text-sm font-semibold text-pink hover:underline">Revisar cuentas pendientes de aprobación</Link>
      <div className="mt-6 rounded-md border border-border bg-white p-6">
        <h2 className="font-display text-xl font-semibold">Aprobar entradas por transferencia</h2>
        <p className="mt-2 text-sm text-ink/70">{receiptQueue.error ? "No se pudo consultar la cantidad de pendientes." : `${receiptQueue.count ?? 0} comprobantes pendientes de revisión.`} Revisa la imagen y comprueba el ingreso bancario antes de confirmar la compra.</p>
        <Link href="/admin/transfers" className="mt-4 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">Ver comprobantes y aprobar entradas</Link>
      </div>
      <div className="mt-10 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Events</h1>
        <Link
          href="/admin/events/new"
          className="flex cursor-pointer items-center gap-2 rounded-full bg-gradient-buddy px-5 py-2.5 text-sm font-display font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md"
        >
          <Plus size={16} />
          New event
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-md border border-border bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-paper-sunk text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3 font-semibold">Event</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Registered</th>
              <th className="px-4 py-3 font-semibold">Configuración</th>
            </tr>
          </thead>
          <tbody>
            {(events as Pick<EventRow, "id" | "slug" | "title" | "event_date" | "type" | "status" | "category" | "capacity">[] | null)?.map((event) => (
              <tr key={event.id} className="border-b border-border last:border-0 hover:bg-paper-sunk/60">
                <td className="px-4 py-3">
                  <Link href={`/admin/events/${event.id}`} className="font-semibold text-ink hover:text-pink">
                    {event.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink/65">{formatEventDate(event.event_date)}</td>
                <td className="px-4 py-3">
                  <CategoryBadge category={event.category} />
                </td>
                <td className="px-4 py-3 text-ink/65 capitalize">{event.type}</td>
                <td className="px-4 py-3">
                  <Badge tone={event.status === "open" ? "success" : "neutral"}>{event.status}</Badge>
                </td>
                <td className="px-4 py-3 text-ink/65">
                  {counts.get(event.id) ?? 0}
                  {event.capacity != null ? ` / ${event.capacity}` : ""}
                </td>
                <td className="px-4 py-3"><Link href={`/admin/events/${event.id}`} className="font-semibold text-pink hover:underline">Editar configuración</Link></td>
              </tr>
            ))}
            {(!events || events.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink/50">
                  No events yet — create your first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
