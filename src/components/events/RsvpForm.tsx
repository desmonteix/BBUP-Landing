"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitRsvp, type RsvpState } from "@/lib/actions/registrations";

const initialState: RsvpState = { status: "idle" };

export function RsvpForm({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState(submitRsvp, initialState);

  if (state.status === "success") {
    return (
      <div className="flex items-start gap-3 rounded-md bg-success/10 p-5" role="status">
        <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={22} />
        <div>
          <p className="font-display font-semibold text-success">You&rsquo;re on the list!</p>
          <p className="mt-1 text-sm text-ink/70">{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      <Field label="Full name" name="name" type="text" required autoComplete="name" />
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <Field label="Phone (optional)" name="phone" type="tel" autoComplete="tel" />

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
        {pending ? "Reserving your spot…" : "Reserve my free spot"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-ink/80">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="w-full rounded-sm border border-border bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-ink/35 focus-visible:border-pink focus-visible:shadow-glow"
      />
    </div>
  );
}
