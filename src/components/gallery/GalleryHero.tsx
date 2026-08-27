"use client";

import DiagonalMarqueeCarousel from "@/components/ui/great-ui-diagonal-marquee-carousel";

/**
 * Gallery hero: the diagonal marquee of gallery photos fills the section,
 * with the page title overlaid in the center over a dark scrim — same
 * "full-bleed visual with legible overlay copy" pattern as the Home hero.
 */
export function GalleryHero() {
  return (
    <section className="relative h-[70vh] min-h-[420px] w-full overflow-hidden bg-ink">
      <DiagonalMarqueeCarousel
        className="absolute inset-0 h-full"
        fadeClassName="from-ink"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-ink/55"
      />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center sm:px-8">
        <span className="font-body text-sm font-semibold uppercase tracking-widest text-white/70">
          Gallery
        </span>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-[1.05] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.35)] sm:text-5xl">
          Moments, not staged photos.
        </h1>
      </div>
    </section>
  );
}
