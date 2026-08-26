"use client";

import { useActionState } from "react";
import { subscribeToNewsletter, type NewsletterState } from "@/lib/actions/newsletter";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

const initialState: NewsletterState = { status: "idle" };

export function NewsletterForm({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    subscribeToNewsletter,
    initialState
  );

  if (state.status === "success") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-full bg-success/10 px-4 py-3 text-sm font-semibold text-success",
          className
        )}
        role="status"
      >
        <CheckCircle2 size={18} />
        {state.message}
      </div>
    );
  }

  return (
    <form action={formAction} className={cn("w-full", className)}>
      <div
        className={cn(
          "flex w-full items-stretch gap-2",
          compact ? "flex-col sm:flex-row" : "flex-col sm:flex-row"
        )}
      >
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          placeholder="you@email.com"
          className="w-full flex-1 rounded-full border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-ink/40 focus-visible:border-pink focus-visible:shadow-glow"
        />
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer whitespace-nowrap rounded-full bg-gradient-buddy px-5 py-3 text-sm font-display font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md disabled:opacity-60"
        >
          {pending ? "Joining…" : "Join the list"}
        </button>
      </div>
      {state.status === "error" && (
        <p className="mt-2 text-xs font-semibold text-error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
