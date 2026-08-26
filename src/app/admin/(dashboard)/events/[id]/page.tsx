import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateEvent } from "@/lib/actions/admin";
import { EventForm } from "@/components/admin/EventForm";
import { RegistrantsTable } from "@/components/admin/RegistrantsTable";
import type { AdminRegistrantRow, EventRow } from "@/lib/types";

export const metadata = { title: "Admin — Edit event" };
export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select(
      "id, slug, title, description, cover_image, event_date, location, type, price_pen, price_usd, capacity, status, category, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!event) notFound();

  const { data: registrants } = await admin
    .from("admin_registrants")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  const boundUpdate = updateEvent.bind(null, id);

  return (
    <div>
      <Link href="/admin" className="flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-pink">
        <ArrowLeft size={16} />
        Back to events
      </Link>
      <h1 className="mt-4 font-display text-2xl font-semibold text-ink">{(event as EventRow).title}</h1>

      <div className="mt-6 max-w-2xl rounded-md border border-border bg-white p-7 shadow-sm">
        <EventForm event={event as EventRow} action={boundUpdate} />
      </div>

      <div className="mt-10">
        <h2 className="font-display text-lg font-semibold text-ink">
          Registrants ({registrants?.length ?? 0})
        </h2>
        <div className="mt-4">
          <RegistrantsTable registrants={(registrants as AdminRegistrantRow[] | null) ?? []} />
        </div>
      </div>
    </div>
  );
}
