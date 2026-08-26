import Image from "next/image";
import { Quote } from "lucide-react";
import type { Testimonial } from "@/lib/types";
import { Reveal } from "@/components/ui/Reveal";
import { staggerDelay } from "@/lib/utils";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Container } from "@/components/ui/Container";
import { CrossingPaths } from "@/components/ui/CrossingPaths";

export function Testimonials({
  items,
  eyebrow = "In their words",
  title = "It's the people, every time.",
}: {
  items: Testimonial[];
  eyebrow?: string;
  title?: string;
}) {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <SectionHeading eyebrow={eyebrow} title={title} align="center" />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t, i) => (
            <Reveal key={t.id} delay={staggerDelay(i)}>
              <figure className="flex h-full flex-col rounded-md border border-border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-pink/30 hover:shadow-md">
                <Quote className="text-pink" size={22} aria-hidden="true" />
                <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-ink/80">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  {t.avatar && (
                    <Image
                      src={t.avatar}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-display text-sm font-semibold text-ink">
                      {t.name}
                    </p>
                    <p className="text-xs text-ink/55">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </Container>
      <CrossingPaths className="mt-16" />
    </section>
  );
}
