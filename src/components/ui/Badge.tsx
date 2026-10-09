import { cn } from "@/lib/utils";

type Tone = "pink" | "blue" | "success" | "error" | "neutral";

const tones: Record<Tone, string> = {
  pink: "bg-pink-tint text-pink",
  blue: "bg-blue-tint text-[#1C7FAE]",
  success: "bg-success/10 text-success",
  // bg-error/5, not /10: the heavier tint drops text-error to 4.32:1, under
  // the 4.5:1 AA needs for this 12px semibold text.
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
