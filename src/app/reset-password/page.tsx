import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Choose a new password",
};

/**
 * Where the emailed recovery link lands. The token arrives in the query
 * string and is only ever handed back to Supabase by the server action that
 * redeems it (`resetPassword`) — this page never resolves it to a user, so a
 * guessed or expired token reveals nothing about who it belonged to.
 *
 * `token_hash` is read from the URL rather than a Supabase-hosted redirect so
 * the whole flow stays on this domain.
 */
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string }>;
}) {
  const { token_hash: tokenHash } = await searchParams;

  if (!tokenHash) {
    return (
      <AuthShell
        eyebrow="Account recovery"
        title="That link is incomplete"
        description="Reset links only work in full, straight from the email."
      >
        <p className="text-center text-sm text-ink/70">
          Copying the address by hand usually drops part of it.{" "}
          <Link href="/forgot-password" className="font-semibold text-pink-on-tint hover:underline">
            Request a new link
          </Link>{" "}
          and open it from your inbox.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Choose a new password"
      description="Once you save it, you'll be signed in with the new password."
    >
      <ResetPasswordForm tokenHash={tokenHash} />
    </AuthShell>
  );
}
