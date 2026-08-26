"use client";

import { useActionState } from "react";
import { updateProfile, type AuthState } from "@/lib/actions/auth";
import { NATIONALITIES, type Profile } from "@/lib/types";
import { TextField } from "@/components/auth/FormField";
import { CheckCircle2 } from "lucide-react";

const initialState: AuthState = { status: "idle" };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <TextField label="First name" name="firstName" defaultValue={profile.first_name} required />
        <TextField label="Last name" name="lastName" defaultValue={profile.last_name} required />
      </div>
      <div>
        <label htmlFor="nationality" className="mb-1.5 block text-sm font-semibold text-ink/80">
          Nationality
        </label>
        <select
          id="nationality"
          name="nationality"
          required
          defaultValue={profile.nationality}
          className="w-full cursor-pointer rounded-sm border border-border bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors duration-200 focus-visible:border-pink focus-visible:shadow-glow"
        >
          {NATIONALITIES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink/45">
          Changing this affects the price shown on future ticket purchases only.
        </p>
      </div>

      {state.status === "success" && (
        <p className="flex items-center gap-2 text-sm font-semibold text-success" role="status">
          <CheckCircle2 size={16} /> {state.message}
        </p>
      )}
      {state.status === "error" && (
        <p className="text-sm font-semibold text-error" role="alert">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-full bg-gradient-buddy px-6 py-3 font-display font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
