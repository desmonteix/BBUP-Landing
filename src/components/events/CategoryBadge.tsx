import { COMMITTEES, type CommitteeKey } from "@/lib/committees";

/**
 * Small category chip shown on event cards, colored per the owning
 * committee (spec §5, §6). Solid dot + tinted pill + darkened text — see
 * src/lib/committees.ts for why the text color is darker than the raw
 * sampled swatch (contrast on the light tint background).
 */
export function CategoryBadge({ category }: { category: CommitteeKey }) {
  const c = COMMITTEES[category];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-body font-semibold"
      style={{ backgroundColor: c.tint, color: c.text }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: c.solid }}
        aria-hidden="true"
      />
      {c.label}
    </span>
  );
}
