import Image from "next/image";
import { CalendarDays, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listEvents } from "@/lib/db/events";
import { getCurrentNationality } from "@/lib/auth";
import { formatEventDate } from "@/lib/utils";
import { formatMoney } from "@/lib/pricing";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CategoryBadge } from "@/components/events/CategoryBadge";
import { Reveal } from "@/components/ui/Reveal";
import { Container } from "@/components/ui/Container";

export async function UpcomingEventTeaser() {
  const supabase = await createClient();
  const viewerNationality = await getCurrentNationality();
  const upcoming = await listEvents(supabase, { when: "upcoming", viewerNationality });
  const next = upcoming[0];

  if (!next) return null;

  return (
    <section className="py-20 sm:py-24">
      <Container>
        <Reveal>
          <div className="grid gap-8 overflow-hidden rounded-lg border border-border bg-white shadow-md lg:grid-cols-2">
            <div className="relative aspect-[16/10] lg:aspect-auto">
              <Image
                src={next.cover_image ?? "/images/events/welcome-mixer.svg"}
                alt={next.title}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center p-8 sm:p-10">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="pink">Up next</Badge>
                <CategoryBadge category={next.category} />
                {next.type === "free" ? (
                  <Badge tone="success">Free</Badge>
                ) : next.resolved_price ? (
                  <Badge tone="blue">
                    From{" "}
                    {next.resolved_price.displayPriceUsd != null
                      ? formatMoney(next.resolved_price.displayPriceUsd, "USD")
                      : formatMoney(next.resolved_price.chargeAmountPen, "PEN")}
                  </Badge>
                ) : (
                  <Badge tone="neutral">Paid</Badge>
                )}
              </div>

              <h3 className="mt-4 font-display text-2xl font-semibold text-ink sm:text-3xl">
                {next.title}
              </h3>

              <div className="mt-4 flex flex-col gap-2 text-sm text-ink/65">
                <span className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-pink" />
                  {formatEventDate(next.event_date)}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin size={16} className="text-pink" />
                  {next.location}
                </span>
              </div>

              <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-ink/65">
                {next.description}
              </p>

              <LinkButton href="/events" className="mt-6 self-start">
                See details &amp; RSVP
              </LinkButton>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
