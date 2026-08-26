import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatEventTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isPastEvent(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

/**
 * Index-based delay for staggered card-grid reveals (see components/ui/Reveal.tsx).
 * Deliberately NOT in Reveal.tsx: that file is "use client", and Next.js
 * treats every export of a client-directive module as a client reference —
 * calling a plain function from a Server Component (About/Home sections)
 * fails even though staggerDelay itself has no client-only behavior.
 */
export function staggerDelay(index: number, step = 0.08, max = 0.4) {
  return Math.min(index * step, max);
}
