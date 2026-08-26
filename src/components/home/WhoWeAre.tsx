import { Reveal } from "@/components/ui/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowRight } from "lucide-react";

export function WhoWeAre() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-content px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <SectionHeading
              eyebrow="Who we are"
              title="A student org built by people who were once the new kid."
              description="We started Best Buddy UP! because arriving in a new country without a single familiar face is hard — even when the city is beautiful. Every buddy on our team was once an exchange student too, or spent a semester showing one around Lima."
            />
            <LinkButton href="/about" variant="ghost" className="mt-6 px-0">
              Read our full story
              <ArrowRight size={16} />
            </LinkButton>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FactCard title="No applications, just events" body="Show up to a free event, meet people, decide if you want in — that's the whole onboarding." />
              <FactCard title="Every event, a mix of both" body="We never run a Peruvians-only or students-only event. That's the entire point." />
              <FactCard title="Free monthly meetups" body="Rooftop hangouts, trivia nights, and language exchanges — always free, always open." />
              <FactCard title="A few paid trips a year" body="Cusco, the coast, the jungle — priced fairly in soles or dollars depending on where you're from." />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FactCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="group flex gap-4 rounded-md border border-border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-pink/30 hover:shadow-md">
      <span
        className="mt-1 h-8 w-1.5 shrink-0 rounded-full bg-gradient-buddy transition-transform duration-200 group-hover:scale-y-125"
        aria-hidden="true"
      />
      <div>
        <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/65">{body}</p>
      </div>
    </div>
  );
}
