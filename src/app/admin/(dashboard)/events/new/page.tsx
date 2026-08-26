import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EventForm } from "@/components/admin/EventForm";
import { createEvent } from "@/lib/actions/admin";

export const metadata = { title: "Admin — New event" };

export default function NewEventPage() {
  return (
    <div>
      <Link href="/admin" className="flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-pink">
        <ArrowLeft size={16} />
        Back to events
      </Link>
      <h1 className="mt-4 font-display text-2xl font-semibold text-ink">New event</h1>

      <div className="mt-6 max-w-2xl rounded-md border border-border bg-white p-7 shadow-sm">
        <EventForm action={createEvent} />
      </div>
    </div>
  );
}
