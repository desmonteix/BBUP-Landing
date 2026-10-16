import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AccountApprovalRow } from "@/components/admin/AccountApprovalRow";
import type { Profile } from "@/lib/types";
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Aprobación de cuentas" };

export default async function AccountApprovalsPage() {
  await requireAdmin();
  const { data, error } = await createAdminClient().from("profiles")
    .select("id, first_name, last_name, dni_id, nationality, email, created_at, nationality_approval")
    .eq("nationality_approval", "pending").eq("nationality", "Peruvian")
    .order("created_at", { ascending: true }).order("id", { ascending: true }).limit(100);
  return <div>
    <Link href="/admin" className="text-sm font-semibold text-pink hover:underline">Volver a administración</Link>
    <h1 className="mt-4 font-display text-2xl font-semibold">Cuentas pendientes de aprobación</h1>
    <p className="mt-2 max-w-2xl text-sm text-ink/70">Estas personas declararon nacionalidad peruana y un DNI de 8 dígitos que no empieza por 7. Revisa sus datos antes de autorizar la cuenta. Hasta entonces no podrán comprar entradas.</p>
    {error ? <p role="alert" className="mt-5 text-error">No se pudo cargar la lista de revisión. Comprueba que la migración de aprobación esté aplicada.</p>
      : !data?.length ? <p className="mt-6 rounded-md border border-border bg-white p-5 text-sm">No hay cuentas pendientes de revisión.</p>
      : <div className="mt-6 overflow-x-auto rounded-md border border-border bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-border bg-paper-sunk"><tr><th className="px-4 py-3">Persona</th><th className="px-4 py-3">DNI</th><th className="px-4 py-3">Solicitud</th><th className="px-4 py-3">Decisión del administrador</th></tr></thead>
          <tbody>{(data as Profile[]).map(profile => <AccountApprovalRow key={`${profile.id}:${profile.dni_id}`} profile={profile} />)}</tbody>
        </table>
      </div>}
    {data?.length === 100 && <p className="mt-3 text-xs text-ink/65">Se muestran las primeras 100 solicitudes. Al resolverlas aparecerán las siguientes.</p>}
  </div>;
}
