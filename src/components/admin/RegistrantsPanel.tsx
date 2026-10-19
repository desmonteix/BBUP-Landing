"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { refreshEventPayments, type ReconciliationState } from "@/lib/actions/payments";
import { RegistrantsTable } from "@/components/admin/RegistrantsTable";
import type { AdminRegistrantRow } from "@/lib/types";

const initialState: ReconciliationState = { status: "idle" };
export function RegistrantsPanel({ eventId, registrants }: { eventId: string; registrants: AdminRegistrantRow[] }) {
  const [state, action, pending] = useActionState(refreshEventPayments.bind(null, eventId), initialState);
  const [filter, setFilter] = useState("all");
  const count = (status: string) => registrants.filter(row => row.payment_status === status).length;
  const confirmedSeats = registrants.filter(row => row.payment_status === "paid").reduce((total, row) => total + row.ticket_quantity, 0);
  const visible = filter === "all" ? registrants : registrants.filter(row => row.payment_status === filter);
  return <div className="space-y-4">
    <Link href="/admin/transfers" className="inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Ver comprobantes y aprobar entradas</Link>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-white p-4">
      <div className="text-sm text-ink/75">
        <p><strong className="text-success">{count("paid")} pagados</strong> · {count("pending")} pendientes · {count("failed")} rechazados/cancelados</p>
        <p className="mt-1 text-xs">{confirmedSeats} entradas con pago confirmado</p>
      </div>
      <form action={action}>
        <button disabled={pending} type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Consultando Mercado Pago…" : state.nextOffset ? "Revisar siguientes compras" : "Actualizar pagos"}
        </button>
      </form>
    </div>
    <p className="text-xs text-ink/65">Estar inscrito no significa haber pagado. Usa «Actualizar pagos» para recuperar confirmaciones que no hayan llegado automáticamente. Se revisan hasta 20 compras por lote.</p>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`rounded-md border p-3 text-sm ${state.status === "error" ? "border-error bg-error/10 text-error" : "border-border bg-paper-sunk text-ink"}`}>{state.message}</p>}
    <label className="flex flex-wrap items-center gap-3 text-sm font-semibold">
      Filtrar por pago
      <select value={filter} onChange={event => setFilter(event.target.value)} className="rounded-sm border border-border bg-white px-3 py-2 font-normal">
        <option value="all">Todos ({registrants.length})</option>
        <option value="paid">Pagados ({count("paid")})</option>
        <option value="pending">Pendientes ({count("pending")})</option>
        <option value="failed">Rechazados / cancelados ({count("failed")})</option>
        <option value="n/a">No requiere pago ({count("n/a")})</option>
      </select>
    </label>
    <RegistrantsTable registrants={visible} checks={state.result?.checks} />
  </div>;
}
