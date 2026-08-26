"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * The site's signature element (design-system/best-buddy-up/MASTER.md).
 * Two gradient strokes — one pink-anchored, one blue-anchored — crossing
 * like two people's routes meeting halfway. Used as the section divider
 * between major blocks. Animates a one-time stroke-draw on first viewport
 * entry; renders fully-drawn and static when reduced motion is requested.
 */
export function CrossingPaths({ className = "" }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => ({
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay: i * 0.15, duration: prefersReducedMotion ? 0 : 1.1, ease: "easeInOut" },
        opacity: { delay: i * 0.15, duration: 0.3 },
      },
    }),
  };

  return (
    <div
      aria-hidden="true"
      className={`mx-auto w-full max-w-[220px] py-2 ${className}`}
    >
      <motion.svg
        viewBox="0 0 220 40"
        width="100%"
        height="40"
        initial={prefersReducedMotion ? undefined : "hidden"}
        whileInView={prefersReducedMotion ? undefined : "visible"}
        animate={prefersReducedMotion ? "visible" : undefined}
        viewport={{ once: true, amount: 0.8 }}
      >
        <defs>
          <linearGradient id="cp-pink" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#E23A82" />
            <stop offset="100%" stopColor="#C24FA8" />
          </linearGradient>
          <linearGradient id="cp-blue" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#C24FA8" />
            <stop offset="100%" stopColor="#4FB4E8" />
          </linearGradient>
        </defs>
        <motion.path
          d="M4 8 C 70 8, 150 32, 216 32"
          fill="none"
          stroke="url(#cp-pink)"
          strokeWidth="2.5"
          strokeLinecap="round"
          custom={0}
          variants={draw}
        />
        <motion.path
          d="M4 32 C 70 32, 150 8, 216 8"
          fill="none"
          stroke="url(#cp-blue)"
          strokeWidth="2.5"
          strokeLinecap="round"
          custom={1}
          variants={draw}
        />
        <circle cx="110" cy="20" r="3.5" fill="#E23A82" />
      </motion.svg>
    </div>
  );
}
