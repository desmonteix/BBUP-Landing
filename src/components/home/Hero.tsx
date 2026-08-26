"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { LinkButton } from "@/components/ui/Button";
import { GlobeWorldTour } from "@/components/ui/cobe-globe-world-tour";
import { ArrowRight } from "lucide-react";

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
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const headlineWord: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Hero() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden pb-20 pt-10 sm:pb-28 sm:pt-14">
      {/* Decorative gradient blobs — accent only, contained, not full-bleed */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-buddy opacity-[0.14] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 right-[-10%] h-96 w-96 rounded-full bg-gradient-buddy opacity-[0.12] blur-3xl"
      />

      <div className="mx-auto grid max-w-content items-center gap-10 px-5 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
        {/* Globe first in DOM and, on mobile, first visually too — the
            literal first thing a visitor sees: a live tour of countries
            exchange students come from, always landing on Peru. */}
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="order-1 flex justify-center lg:order-2 lg:justify-end"
        >
          <div className="relative w-full max-w-[280px] sm:max-w-[340px] lg:max-w-[440px]">
            <GlobeWorldTour />
            <div className="pointer-events-none absolute -bottom-4 -left-4 hidden rounded-lg bg-white px-5 py-4 shadow-lg sm:block">
              <p className="font-display text-2xl font-semibold text-ink">34</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                countries, one crew
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="order-2 text-center lg:order-1 lg:text-left"
        >
          <span className="inline-flex items-center rounded-full bg-pink-tint px-4 py-1.5 font-body text-sm font-semibold text-pink">
            Lima, Peru · student-run since 2019
          </span>

          <motion.h1
            className="mt-6 flex flex-wrap justify-center gap-x-[0.28em] font-display text-4xl font-semibold leading-[1.05] text-ink sm:text-5xl lg:justify-start lg:text-6xl"
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

          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-ink/70 lg:mx-0">
            Best Buddy UP! pairs exchange students with Peruvian buddies and
            fills the gaps between classes with real culture — food trips,
            weekend getaways, and friendships that outlast the semester.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
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
    </section>
  );
}
