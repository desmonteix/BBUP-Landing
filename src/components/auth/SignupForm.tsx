"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { signUp, reportInvalidSignup, type AuthState } from "@/lib/actions/auth";
import { isValidPeruvianDni, requiresNationalityApproval } from "@/lib/nationality";
import { NATIONALITIES } from "@/lib/types";
import { TextField } from "@/components/auth/FormField";
import { CheckCircle2 } from "lucide-react";

const initialState: AuthState = { status: "idle" };

export function SignupForm() {
  const [dniError, setDniError] = useState<string | null>(null);
  const [manualReview, setManualReview] = useState(false);
  const [reporting, startReport] = useTransition();
  const [state, formAction, pending] = useActionState(async (previous: AuthState, data: FormData): Promise<AuthState> => {
    if (data.get("nationality") === "Peruvian" && !isValidPeruvianDni(data.get("dniId"))) {
      // This action only audits: an invalid DNI never reaches the account-creation action.
      return reportInvalidSignup(data);
    }
    return signUp(previous, data);
  }, initialState);

  if (state.status === "success") {
    return (
      <div className="flex items-start gap-3 rounded-md bg-success/10 p-5" role="status">
        <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={22} />
        <div>
          <p className="font-display font-semibold text-success">{state.requiresApproval ? "Pendiente de aprobación" : "Almost there"}</p>
          <p className="mt-1 text-sm text-ink/70">{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" onSubmit={(event) => {
      const data = new FormData(event.currentTarget);
      if (data.get("nationality") !== "Peruvian" || isValidPeruvianDni(data.get("dniId"))) {
        setDniError(null);
        return;
      }
      event.preventDefault();
      setDniError("TypeError: DNI inválido. Para nacionalidad peruana, escribe exactamente 8 dígitos, sin letras, signos ni espacios. Corrige tu DNI o selecciona tu nacionalidad correcta.");
      (event.currentTarget.elements.namedItem("dniId") as HTMLInputElement | null)?.focus();
      // Report separately so the rejected form keeps all values for correction.
      startReport(async () => {
        try { await reportInvalidSignup(data); }
        catch { console.warn("[signup] could not submit nationality failure report"); }
      });
    }} onChange={(event) => {
      const input: EventTarget = event.target;
      if (!(input instanceof HTMLInputElement) && !(input instanceof HTMLSelectElement)) return;
      if (input.name !== "dniId" && input.name !== "nationality") return;
      const data = new FormData(event.currentTarget);
      setManualReview(requiresNationalityApproval(data.get("nationality"), data.get("dniId")));
      if (data.get("nationality") !== "Peruvian" || isValidPeruvianDni(data.get("dniId"))) setDniError(null);
    }}>
      <div className="grid grid-cols-2 gap-4">
        <TextField label="First name" name="firstName" autoComplete="given-name" required />
        <TextField label="Last name" name="lastName" autoComplete="family-name" required />
      </div>
      {dniError && <div id="nationality-error" role="alert" className="rounded-md border-2 border-error bg-error/10 p-4 text-sm text-error">
        <p className="font-semibold">Revisa tu DNI y nacionalidad</p>
        <p className="mt-1">{dniError}</p>
        <p className="mt-2 font-semibold">Tu cuenta no se ha creado.</p>
      </div>}
      <TextField
        label="DNI / passport number"
        name="dniId"
        autoComplete="off"
        required
        invalid={Boolean(dniError)}
        describedBy={dniError ? "nationality-error" : undefined}
        hint="Para nacionalidad peruana: exactamente 8 dígitos. Si no empieza por 7, requiere aprobación del administrador."
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
          aria-invalid={Boolean(dniError) || undefined}
          aria-describedby={dniError ? "nationality-error" : undefined}
          className={`w-full cursor-pointer rounded-sm border ${dniError ? "border-error" : "border-border"} bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors duration-200 focus-visible:border-pink focus-visible:shadow-glow`}
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
      {manualReview && <p role="status" className="rounded-md border border-pink/40 bg-paper-sunk p-4 text-sm text-ink/80">Tu DNI tiene un formato válido, pero no empieza por 7. Tu cuenta quedará pendiente de autorización del administrador; no podrás comprar entradas hasta su aprobación.</p>}
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
        disabled={pending || reporting}
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
