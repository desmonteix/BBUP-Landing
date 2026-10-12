"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "@/lib/actions/auth";
import { TextField } from "@/components/auth/FormField";

const initialState: AuthState = { status: "idle" };

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}
      <TextField label="Email" name="email" type="email" autoComplete="email" required />
      <TextField label="Password" name="password" type="password" autoComplete="current-password" required />

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
        {pending ? "Logging in…" : "Log in"}
      </button>

      <p className="text-center text-sm text-ink/60">
        <Link href="/forgot-password" className="font-semibold text-pink-on-tint hover:underline">
          Forgot your password?
        </Link>
      </p>

      <p className="text-center text-sm text-ink/60">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-pink-on-tint hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
