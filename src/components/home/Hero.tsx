"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { LinkButton } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export function Hero() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden pb-20 pt-14 sm:pb-28 sm:pt-20">
      {/* Decorative gradient blobs — accent only, contained, not full-bleed */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-buddy opacity-[0.14] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 right-[-10%] h-96 w-96 rounded-full bg-gradient-buddy opacity-[0.12] blur-3xl"
      />

      <div className="mx-auto grid max-w-content items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-flex items-center rounded-full bg-pink-tint px-4 py-1.5 font-body text-sm font-semibold text-pink">
            Lima, Peru · student-run since 2019
          </span>

          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] text-ink sm:text-5xl lg:text-6xl">
            Hey there, welcome
            <br />
            to your home away
            <br />
            from home.
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/70">
            Best Buddy UP! pairs exchange students with Peruvian buddies and
            fills the gaps between classes with real culture — food trips,
            weekend getaways, and friendships that outlast the semester.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/events" size="lg">
              See what&rsquo;s next
              <ArrowRight size={18} />
            </LinkButton>
            <LinkButton href="/about" variant="secondary" size="lg">
              Our story
            </LinkButton>
          </div>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="relative overflow-hidden rounded-lg shadow-lg">
            <Image
              src="/images/hero/home-hero.svg"
              alt="Exchange students and Peruvian buddies together at a Best Buddy UP! event"
              width={1920}
              height={1080}
              priority
              className="aspect-[16/10] w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-5 -left-5 hidden rounded-lg bg-white px-5 py-4 shadow-lg sm:block">
            <p className="font-display text-2xl font-semibold text-ink">34</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
              countries, one crew
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
