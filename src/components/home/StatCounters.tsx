"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { STATS } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Container } from "@/components/ui/Container";

/**
 * Signature "passport stamp" stat counters — a gradient ring (echoing the
 * Crossing Paths motif) around each number instead of a generic bordered
 * stat box. Counts up once when scrolled into view.
 */
export function StatCounters() {
  return (
    <section className="bg-paper-sunk py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="The numbers"
          title="A community that keeps growing."
          align="center"
        />
        <div className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {STATS.map((stat, i) => (
            <StampCounter key={stat.label} {...stat} delay={i * 0.1} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function StampCounter({
  label,
  value,
  suffix,
  delay,
}: {
  label: string;
  value: number;
  suffix: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(prefersReducedMotion ? value : 0);

  useEffect(() => {
    if (!inView || prefersReducedMotion) return;
    const duration = 1400;
    const start = performance.now();

    let raf: number;
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, prefersReducedMotion]);

  return (
    <motion.div
      ref={ref}
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col items-center text-center"
    >
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-md sm:h-28 sm:w-28">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from -90deg, #E23A82, #C24FA8, #4FB4E8, transparent 0)",
            padding: 3,
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
          aria-hidden="true"
        />
        <span className="font-display text-xl font-semibold text-ink sm:text-2xl">
          {display}
          {suffix}
        </span>
      </div>
      <p className="mt-4 max-w-[10rem] text-sm font-medium text-ink/65">
        {label}
      </p>
    </motion.div>
  );
}
