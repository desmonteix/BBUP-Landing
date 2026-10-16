import Link from "next/link";
import { accountApprovalMessage, getAccountApproval } from "@/lib/nationality";
import type { Profile } from "@/lib/types";
export function AccountApprovalNotice({ profile }: { profile: Profile }) {
  const message = accountApprovalMessage(profile);
  if (!message) return null;
  return <div role="status" className="my-6 rounded-md border border-pink/40 bg-paper-sunk p-5">
    <p className="font-semibold">{getAccountApproval(profile) === "pending" ? "Cuenta pendiente de aprobación" : "Revisa el estado de tu cuenta"}</p>
    <p className="mt-2 text-sm text-ink/75">{message}</p>
    <Link href="/account" className="mt-3 inline-block text-sm font-semibold text-pink underline">Revisar mi perfil</Link>
  </div>;
}
