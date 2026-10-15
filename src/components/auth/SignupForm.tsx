"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthState } from "@/lib/actions/auth";
import { NATIONALITIES } from "@/lib/types";
import { TextField } from "@/components/auth/FormField";
import { CheckCircle2 } from "lucide-react";

const initialState: AuthState = { status: "idle" };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  if (state.status === "success") {
    return (
      <div className="flex items-start gap-3 rounded-md bg-success/10 p-5" role="status">
        <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={22} />
        <div>
          <p className="font-display font-semibold text-success">Almost there</p>
          <p className="mt-1 text-sm text-ink/70">{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <TextField label="First name" name="firstName" autoComplete="given-name" required />
        <TextField label="Last name" name="lastName" autoComplete="family-name" required />
      </div>
      <TextField
        label="DNI / passport number"
        name="dniId"
        autoComplete="off"
        required
        hint="Stored on your profile only — never used to log in."
      />
      <div>
        <label htmlFor="nationality" className="mb-1.5 block text-sm font-semibold text-ink/80">
          Nationality
        </label>
        <select
          id="nationality"
          name="nationality"
          required
          defaultValue=""
          className="w-full cursor-pointer rounded-sm border border-border bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors duration-200 focus-visible:border-pink focus-visible:shadow-glow"
        >
          <option value="" disabled>
            Select your nationality
          </option>
          {NATIONALITIES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink/45">
          This determines your ticket pricing (PEN for Peruvian, EUR otherwise). You can
          correct it later from your account.
        </p>
      </div>
      <TextField label="Email" name="email" type="email" autoComplete="email" required />
      <TextField
        label="Password"
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
        {pending ? "Creating your account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-ink/60">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-pink hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
