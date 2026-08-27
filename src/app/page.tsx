import { Hero } from "@/components/home/Hero";
import { WhoWeAre } from "@/components/home/WhoWeAre";
import { UpcomingEventTeaser } from "@/components/home/UpcomingEventTeaser";
import { StatCounters } from "@/components/home/StatCounters";
import { Testimonials } from "@/components/home/Testimonials";
import { NewsletterForm } from "@/components/home/NewsletterForm";
import { CrossingPaths } from "@/components/ui/CrossingPaths";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { TESTIMONIALS_SHORT } from "@/lib/content";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CrossingPaths />
      <WhoWeAre />
      <UpcomingEventTeaser />
      <StatCounters />
      <Testimonials items={TESTIMONIALS_SHORT} />

      <section className="pb-24 pt-4 sm:pb-28">
        <Container>
          <Reveal>
            <div className="rounded-lg bg-gradient-buddy px-8 py-14 text-center shadow-lg sm:px-16">
              <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
                Don&rsquo;t miss the next one.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-white/90">
                One email a month with the next event. No spam, unsubscribe
                anytime.
              </p>
              <div className="mx-auto mt-8 max-w-md">
                <NewsletterForm />
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
