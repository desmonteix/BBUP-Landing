"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { requestPasswordReset, type AuthState } from "@/lib/actions/auth";
import { TextField } from "@/components/auth/FormField";

const initialState: AuthState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);
  const sent = state.status === "success";
  const resultRef = useRef<HTMLDivElement>(null);

  // The result replaces the submit button, so without this the focus ring
  // lands on nothing and a keyboard or screen-reader user is left wondering
  // whether anything happened — on the one page whose job is getting them
  // back in.
  useEffect(() => {
    if (sent) resultRef.current?.focus();
  }, [sent]);

  return (
    <div className="space-y-4">
      {/* Mounted empty from the first render: a live region that appears with
          its text already inside is not reliably announced. */}
      <div
        ref={resultRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="space-y-3 rounded-md text-center outline-none focus-visible:ring-2 focus-visible:ring-pink"
      >
        {sent && (
          <>
            <p className="text-sm text-ink/70">{state.message}</p>
            <p className="text-sm text-ink/70">
              The link works once and expires in about an hour. Nothing after a few minutes? Check
              your spam folder.
            </p>
            <Link
              href="/login"
              className="inline-block font-semibold text-pink-on-tint hover:underline"
            >
              Back to log in
            </Link>
          </>
        )}
      </div>

      {!sent && (
        <form action={formAction} className="space-y-4">
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            hint="We'll send a link to choose a new password."
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
            {pending ? "Sending…" : "Send reset link"}
          </button>

          <p className="text-center text-sm text-ink/70">
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-pink-on-tint hover:underline">
              Log in
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
