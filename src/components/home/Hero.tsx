"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { LinkButton } from "@/components/ui/Button";
import { GlobeWorldTour } from "@/components/ui/cobe-globe-world-tour";
import { ArrowRight, ChevronDown } from "lucide-react";

const HEADLINE_WORDS = [
  "Hey",
  "there,",
  "welcome",
  "to",
  "your",
  "home",
  "away",
  "from",
  "home.",
];

const headlineContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.3 } },
};

const headlineWord: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * Cinematic full-bleed hero (spec addendum, 2026-08-26): the globe fills
 * the entire viewport as the literal first thing a visitor sees — not a
 * small element beside the copy. Headline/CTA are overlaid near the
 * bottom third over a gradient scrim, the standard "hero photo/video with
 * legible overlay text" pattern, so the copy stays readable against a
 * continuously-moving light-colored globe without hiding it behind a
 * solid panel.
 */
export function Hero() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative h-screen min-h-[560px] w-full overflow-hidden bg-ink">
      {/* Oversized square, centered and clipped by the section's
          overflow-hidden — guarantees true edge-to-edge coverage of the
          rectangular viewport regardless of aspect ratio, without needing
          to tune cobe's own scale/offset (a globe render is inherently
          circular; this is what makes it read as full-bleed anyway). */}
      <div className="absolute left-1/2 top-1/2 aspect-square h-[max(100vh,100vw)] -translate-x-1/2 -translate-y-1/2">
        <GlobeWorldTour className="h-full w-full" />
      </div>

      {/* Legibility scrim — dark gradient from the bottom where the copy
          sits, plus a soft top fade so the sticky navbar reads cleanly. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink from-0% via-ink/55 via-40% to-transparent to-80%"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/45 to-transparent"
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-end px-5 pb-20 text-center sm:px-8 sm:pb-28">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.h1
            className="[text-shadow:0_2px_24px_rgba(0,0,0,0.35)] flex flex-wrap justify-center gap-x-[0.28em] font-display text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl"
            variants={prefersReducedMotion ? undefined : headlineContainer}
            initial={prefersReducedMotion ? undefined : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
          >
            {HEADLINE_WORDS.map((word, i) => (
              <motion.span key={i} variants={headlineWord} className="inline-block">
                {word}
              </motion.span>
            ))}
          </motion.h1>

          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-white/85">
            Best Buddy UP! pairs exchange students with Peruvian buddies and
            fills the gaps between classes with real culture — food trips,
            weekend getaways, and friendships that outlast the semester.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <LinkButton href="/events" size="lg">
              See what&rsquo;s next
              <ArrowRight size={18} />
            </LinkButton>
            <LinkButton href="/about" variant="secondary" size="lg">
              Our story
            </LinkButton>
          </div>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center">
        <motion.div
          animate={prefersReducedMotion ? undefined : { y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="text-white/70" size={22} aria-hidden="true" />
        </motion.div>
      </div>
    </section>
  );
}
