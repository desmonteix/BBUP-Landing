import { cn } from "@/lib/utils";

type Tone = "pink" | "blue" | "success" | "error" | "neutral";

// Text here is 12px semibold — normal-size under WCAG, so every tone needs
// 4.5:1. The brand colours do not reach that on their own tints, hence the
// *-on-tint variants; error is the one case a lighter tint could carry.
const tones: Record<Tone, string> = {
  pink: "bg-pink-tint text-pink-on-tint",
  blue: "bg-blue-tint text-blue-on-tint",
  success: "bg-success/10 text-success-on-tint",
  error: "bg-error/5 text-error",
  neutral: "bg-ink/5 text-ink/70",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-body font-semibold uppercase tracking-wider",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
