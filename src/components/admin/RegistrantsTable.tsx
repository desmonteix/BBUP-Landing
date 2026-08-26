import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import type { AdminRegistrantRow } from "@/lib/types";

export function RegistrantsTable({ registrants }: { registrants: AdminRegistrantRow[] }) {
  if (registrants.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-paper-sunk p-8 text-center text-sm text-ink/55">
        No one has registered yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-white shadow-sm">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-border bg-paper-sunk text-xs uppercase tracking-wide text-ink/50">
          <tr>
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Email</th>
            <th className="px-4 py-3 font-semibold">Phone</th>
            <th className="px-4 py-3 font-semibold">Nationality</th>
            <th className="px-4 py-3 font-semibold">Kind</th>
            <th className="px-4 py-3 font-semibold">PEN charged</th>
            <th className="px-4 py-3 font-semibold">USD reference</th>
            <th className="px-4 py-3 font-semibold">Payment</th>
          </tr>
        </thead>
        <tbody>
          {registrants.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-paper-sunk/60">
              <td className="px-4 py-3 font-semibold text-ink">{r.name}</td>
              <td className="px-4 py-3 text-ink/65">{r.email}</td>
              <td className="px-4 py-3 text-ink/65">{r.phone ?? "—"}</td>
              <td className="px-4 py-3 text-ink/65">{r.nationality ?? "—"}</td>
              <td className="px-4 py-3 text-ink/65 capitalize">{r.kind}</td>
              <td className="px-4 py-3 text-ink/65">
                {r.amount_pen != null ? formatMoney(r.amount_pen, "PEN") : "—"}
              </td>
              <td className="px-4 py-3 text-ink/65">
                {r.display_price_usd != null ? (
                  <>
                    {formatMoney(r.display_price_usd, "USD")}
                    {r.exchange_rate_applied != null && (
                      <span className="block text-xs text-ink/40">
                        at {r.exchange_rate_applied.toFixed(3)}
                      </span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3">
                <Badge
                  tone={
                    r.payment_status === "paid"
                      ? "success"
                      : r.payment_status === "failed"
                        ? "error"
                        : r.payment_status === "pending"
                          ? "blue"
                          : "neutral"
                  }
                >
                  {r.payment_status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
