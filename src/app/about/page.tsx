import type { Metadata } from "next";
import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import { Container } from "@/components/ui/Container";
import { CrossingPaths } from "@/components/ui/CrossingPaths";
import { ValuesSection } from "@/components/about/ValuesSection";
import { TeamSection } from "@/components/about/TeamSection";
import { Testimonials } from "@/components/home/Testimonials";
import { TESTIMONIALS_FULL } from "@/lib/content";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Best Buddy UP! is a student-run organization integrating exchange students into Peruvian culture through events, friendships, and community.",
};

export default function AboutPage() {
  return (
    <>
      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            <Reveal>
              <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-pink">
                Our story
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
                We were the new kid once, too.
              </h1>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-ink/70">
                <p>
                  Best Buddy UP! started in 2019 with a simple observation:
                  exchange students land in Lima with a full class schedule
                  and almost no way to meet Peruvians outside of it. So a
                  handful of university students started organizing informal
                  hangouts — nothing official, just dinners and weekend
                  trips.
                </p>
                <p>
                  Seven years later we&rsquo;re a full student organization,
                  dozens of active buddies, and events
                  running most weeks of the semester — but the goal hasn&rsquo;t
                  moved an inch: get an exchange student and a Peruvian
                  student in the same room, and let the friendship happen on
                  its own.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <Image
                src="/images/hero/home-hero.svg"
                alt="Best Buddy UP! members at a group event"
                width={1200}
                height={900}
                className="aspect-[4/3] w-full rounded-lg object-cover shadow-md"
              />
            </Reveal>
          </div>
        </Container>
      </section>

      <CrossingPaths />
      <ValuesSection />
      <TeamSection />
      <Testimonials
        items={TESTIMONIALS_FULL}
        eyebrow="Community voices"
        title="What buddies and exchange students say."
      />
    </>
  );
}
