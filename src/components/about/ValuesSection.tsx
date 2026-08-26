import { VALUES } from "@/lib/content";
import { Reveal } from "@/components/ui/Reveal";
import { staggerDelay } from "@/lib/utils";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Container } from "@/components/ui/Container";

export function ValuesSection() {
  return (
    <section className="bg-paper-sunk py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="What we stand for"
          title="Four things we don't compromise on."
          align="center"
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={staggerDelay(i)}>
              <div className="group flex h-full gap-4 rounded-md border border-transparent bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-pink/30 hover:shadow-md">
                <span
                  className="mt-1 h-8 w-1.5 shrink-0 rounded-full bg-gradient-buddy transition-transform duration-200 group-hover:scale-y-125"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">
                    {v.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/65">
                    {v.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
