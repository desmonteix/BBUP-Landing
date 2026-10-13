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
            <Label htmlFor="pricePen">Price (PEN) — charged to Peruvian buyers</Label>
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
            <Label htmlFor="priceUsd">Price (USD) — display only, exchange students</Label>
            <Input
              id="priceUsd"
              name="priceUsd"
              type="number"
              step="0.01"
              min="0"
              defaultValue={event?.price_usd ?? undefined}
              required
            />
            <p className="mt-1 text-xs text-ink/45">
              Shown as the headline price to non-Peruvian buyers. Mercado Pago can only
              charge soles, so at checkout this is converted to PEN at the current
              exchange rate (see the Exchange rate panel below) — never charged in USD
              directly.
            </p>
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

      <fieldset className="space-y-4 rounded-md border border-border p-4">
        <legend className="px-2 text-sm font-semibold">Configuración del evento</legend>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" name="allowCompanion" defaultChecked={event?.allow_companion ?? false} className="h-4 w-4 accent-pink" />
          Permitir +1 (acompañante)
        </label>
        <p className="text-xs text-ink/60">En compras de entradas, el +1 ocupa un cupo y paga una entrada adicional al precio del comprador.</p>
        {([['promotions', 'Promociones'], ['discounts', 'Descuentos']] as const).map(([name, label]) => (
          <div key={name}>
            <Label htmlFor={name}>{label}</Label>
            <textarea id={name} name={name} defaultValue={event?.[name] ?? ""} rows={3} maxLength={2000}
              className="w-full rounded-sm border border-border bg-white px-4 py-2.5 text-sm text-ink outline-none focus-visible:border-pink" />
          </div>
        ))}
        <p className="text-xs text-ink/60">Estos textos se muestran en el evento. No modifican automáticamente el precio de las entradas.</p>
      </fieldset>

      <fieldset className="space-y-4 rounded-md border border-border p-4">
        <legend className="px-2 text-sm font-semibold">Términos y condiciones</legend>
        <p className="text-xs text-ink/60">Para eventos de pago, ingresa el texto, un enlace o ambos. El comprador debe aceptarlos antes de pagar.</p>
        <div>
          <Label htmlFor="termsText">Texto de los términos y condiciones</Label>
          <textarea id="termsText" name="termsText" defaultValue={event?.terms_text ?? ""} rows={6} maxLength={20000}
            className="w-full rounded-sm border border-border bg-white px-4 py-2.5 text-sm text-ink outline-none focus-visible:border-pink" />
        </div>
        <div>
          <Label htmlFor="termsUrl">Enlace a los términos y condiciones</Label>
          <Input id="termsUrl" name="termsUrl" type="url" defaultValue={event?.terms_url ?? ""} placeholder="https://..." maxLength={2000} />
        </div>
      </fieldset>

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
