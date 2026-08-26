import Image from "next/image";
import { TEAM } from "@/lib/content";
import { COMMITTEE_KEYS, COMMITTEES } from "@/lib/committees";
import { Reveal } from "@/components/ui/Reveal";
import { staggerDelay } from "@/lib/utils";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Container } from "@/components/ui/Container";

/**
 * Team grid grouped by committee (spec §5, added 2026-08-25). Each
 * committee's heading uses that committee's sampled gradient as a small
 * accent bar + label chip — the only two places in the site the committee
 * palette is allowed to appear (see src/lib/committees.ts).
 */
export function TeamSection() {
  const byCommittee = COMMITTEE_KEYS.map((key) => ({
    key,
    members: TEAM.filter((m) => m.committee === key),
  })).filter((group) => group.members.length > 0);

  return (
    <section className="py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="The team"
          title="Nine committees, one crew."
          description="Every committee runs its own slice of Best Buddy UP! — from the trips people actually talk about for years, to the quiet finance work that keeps ticket prices fair."
        />

        <div className="mt-14 space-y-14">
          {byCommittee.map((group, gi) => {
            const c = COMMITTEES[group.key];
            return (
              <Reveal key={group.key} delay={staggerDelay(gi, 0.06)}>
                <div className="mb-5 flex items-center gap-3">
                  <span
                    className="h-2 w-8 rounded-full"
                    style={{ background: c.gradient }}
                    aria-hidden="true"
                  />
                  <h3 className="font-display text-lg font-semibold text-ink">
                    {c.label}
                  </h3>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: c.tint, color: c.text }}
                  >
                    {group.members.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {group.members.map((member) => (
                    <div key={member.id} className="group text-center">
                      <div
                        className="relative mx-auto aspect-square w-full max-w-[10rem] overflow-hidden rounded-full p-1 transition-transform duration-200 group-hover:-translate-y-1"
                        style={{ background: c.gradient }}
                      >
                        <div className="h-full w-full overflow-hidden rounded-full bg-white p-0.5">
                          <Image
                            src={member.photo}
                            alt={member.name}
                            width={320}
                            height={320}
                            className="h-full w-full rounded-full object-cover"
                          />
                        </div>
                      </div>
                      <p className="mt-3 font-display text-sm font-semibold text-ink">
                        {member.name}
                      </p>
                      <p className="text-xs text-ink/55">{member.role}</p>
                    </div>
                  ))}
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
