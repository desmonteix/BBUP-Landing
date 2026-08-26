"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Viewport-triggered scroll reveal. `transform`/`opacity` only. Honors
 * prefers-reduced-motion by rendering with no animation at all.
 *
 * Motion parameters (design-system/best-buddy-up/MASTER.md "Motion"): a
 * small 8-16px offset and a quick 300-400ms ease-out read as a UI detail;
 * anything larger reads as a slide-in effect, which is the generic-feeling
 * "AI template" tell this was tightened away from.
 */
export function Reveal({
  children,
  delay = 0,
  y = 12,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li";
}) {
  const prefersReducedMotion = useReducedMotion();

  const variants: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : y },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, delay, ease: "easeOut" },
    },
  };

  const Component = motion[as];

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={variants}
    >
      {children}
    </Component>
  );
}

