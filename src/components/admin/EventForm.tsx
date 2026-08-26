"use client";

import { useActionState, useState } from "react";
import { COMMITTEE_KEYS } from "@/lib/committees";
import type { EventRow } from "@/lib/types";
import type { AdminFormState } from "@/lib/actions/admin";

const initialState: AdminFormState = { status: "idle" };

export function EventForm({
  event,
  action,
}: {
  event?: EventRow;
  action: (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [type, setType] = useState<"free" | "paid">(event?.type ?? "free");

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={event?.title} required />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            name="slug"
            defaultValue={event?.slug}
            required
            pattern="[a-z0-9-]+"
            placeholder="welcome-mixer-2026"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          defaultValue={event?.description}
          required
          rows={5}
          className="w-full rounded-sm border border-border bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors duration-200 focus-visible:border-pink focus-visible:shadow-glow"
        />
      </div>

      <div>
        <Label htmlFor="coverImage">Cover image URL</Label>
        <Input
          id="coverImage"
          name="coverImage"
          type="url"
          defaultValue={event?.cover_image ?? ""}
          placeholder="/images/events/welcome-mixer.svg or a Supabase Storage URL"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="eventDate">Date &amp; time</Label>
          <Input
            id="eventDate"
            name="eventDate"
            type="datetime-local"
            defaultValue={event ? toDatetimeLocal(event.event_date) : undefined}
            required
          />
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={event?.location} required />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <Label htmlFor="category">Committee</Label>
          <Select id="category" name="category" defaultValue={event?.category}>
            {COMMITTEE_KEYS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="type">Type</Label>
          <Select
            id="type"
            name="type"
            defaultValue={event?.type ?? "free"}
            onChange={(e) => setType(e.target.value as "free" | "paid")}
          >
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={event?.status ?? "open"}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </Select>
        </div>
      </div>

      {type === "paid" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="pricePen">Price (PEN)</Label>
            <Input
              id="pricePen"
              name="pricePen"
              type="number"
              step="0.01"
              min="0"
              defaultValue={event?.price_pen ?? undefined}
              required
            />
          </div>
          <div>
            <Label htmlFor="priceUsd">Price (USD)</Label>
            <Input
              id="priceUsd"
              name="priceUsd"
              type="number"
              step="0.01"
              min="0"
              defaultValue={event?.price_usd ?? undefined}
              required
            />
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="capacity">Capacity (leave blank for unlimited)</Label>
        <Input
          id="capacity"
          name="capacity"
          type="number"
          min="1"
          defaultValue={event?.capacity ?? undefined}
        />
      </div>

      {state.status === "error" && (
        <p className="text-sm font-semibold text-error" role="alert">
          {state.message}
        </p>
      )}
      {state.message && state.status === "idle" && (
        <p className="text-sm font-semibold text-success" role="status">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-full bg-gradient-buddy px-6 py-3 font-display font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-60"
      >
        {pending ? "Saving…" : event ? "Save changes" : "Create event"}
      </button>
    </form>
  );
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink/80">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-sm border border-border bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors duration-200 focus-visible:border-pink focus-visible:shadow-glow"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full cursor-pointer rounded-sm border border-border bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors duration-200 focus-visible:border-pink focus-visible:shadow-glow"
    />
  );
}
