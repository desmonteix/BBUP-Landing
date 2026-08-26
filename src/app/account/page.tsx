import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";
import { formatMoney } from "@/lib/pricing";
import { formatEventDate } from "@/lib/utils";
import { ProfileForm } from "@/components/auth/ProfileForm";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "My account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/account");

  const supabase = await createClient();
  const { data: tickets } = await supabase
    .from("registrations")
    .select("id, amount, currency, payment_status, created_at, events(title, event_date)")
    .eq("profile_id", profile.id)
    .eq("kind", "ticket")
    .order("created_at", { ascending: false });

  return (
    <section className="py-16 sm:py-20">
      <Container className="max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-pink">
              My account
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
              Hey, {profile.first_name}
            </h1>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink/70 transition-colors duration-200 hover:border-pink hover:text-pink"
            >
              <LogOut size={16} />
              Log out
            </button>
          </form>
        </div>

        <div className="mt-10 rounded-lg border border-border bg-white p-7 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-ink">Profile</h2>
          <p className="mt-1 text-sm text-ink/55">{profile.email}</p>
          <div className="mt-6">
            <ProfileForm profile={profile} />
          </div>
        </div>

        <div className="mt-10">
          <h2 className="font-display text-lg font-semibold text-ink">My tickets</h2>
          {!tickets || tickets.length === 0 ? (
            <p className="mt-3 text-sm text-ink/55">
              No paid tickets yet — free RSVPs don&rsquo;t require an account, so they
              won&rsquo;t show up here.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {tickets.map((t) => {
                // Supabase's generated types treat this join as an array;
                // it's a to-one relationship in this schema.
                const event = Array.isArray(t.events) ? t.events[0] : t.events;
                return (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-md border border-border bg-white p-4"
                  >
                    <div>
                      <p className="font-display text-sm font-semibold text-ink">
                        {event?.title ?? "Event"}
                      </p>
                      {event?.event_date && (
                        <p className="text-xs text-ink/55">{formatEventDate(event.event_date)}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink">
                        {t.amount && t.currency ? formatMoney(t.amount, t.currency) : "—"}
                      </p>
                      <Badge
                        tone={
                          t.payment_status === "paid"
                            ? "success"
                            : t.payment_status === "failed"
                              ? "error"
                              : "neutral"
                        }
                      >
                        {t.payment_status}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Container>
    </section>
  );
}
