"use client";
import { useActionState } from "react";
import { reviewNationality, type ApprovalState } from "@/lib/actions/approvals";
import type { Profile } from "@/lib/types";

const initialState: ApprovalState = { status: "idle" };
export function AccountApprovalRow({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(reviewNationality.bind(null, profile.id, profile.dni_id, profile.nationality), initialState);
  return <tr className="border-b border-border last:border-0">
    <td className="px-4 py-3"><p className="font-semibold">{profile.first_name} {profile.last_name}</p><p className="mt-1 text-xs text-ink/65">{profile.email}</p></td>
    <td className="px-4 py-3 font-mono">{profile.dni_id}</td>
    <td className="px-4 py-3 text-sm">Peruana · pendiente de aprobación</td>
    <td className="px-4 py-3">
      <form action={action} className="flex flex-wrap gap-2">
        <button type="submit" name="decision" value="approved" disabled={pending || state.status === "success"} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Guardando…" : "Aprobar cuenta"}</button>
        <button type="submit" name="decision" value="rejected" disabled={pending || state.status === "success"} className="rounded-full border border-error px-4 py-2 text-sm font-semibold text-error disabled:opacity-60">Rechazar</button>
      </form>
      {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`mt-2 text-sm ${state.status === "error" ? "text-error" : "text-success"}`}>{state.message}</p>}
    </td>
  </tr>;
}
