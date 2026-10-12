"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword, type AuthState } from "@/lib/actions/auth";
import { TextField } from "@/components/auth/FormField";

const initialState: AuthState = { status: "idle" };

export function ResetPasswordForm({ tokenHash }: { tokenHash: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token_hash" value={tokenHash} />

      <TextField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
      />

      {state.status === "error" && (
        <p className="text-sm font-semibold text-error" role="alert">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full cursor-pointer rounded-full bg-gradient-buddy px-6 py-3 font-display font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save new password"}
      </button>

      <p className="text-center text-sm text-ink/70">
        Link stopped working?{" "}
        <Link href="/forgot-password" className="font-semibold text-pink-on-tint hover:underline">
          Request another
        </Link>
      </p>
    </form>
  );
}
