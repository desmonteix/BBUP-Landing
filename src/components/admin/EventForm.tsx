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
  const bundle = event?.offer_rules?.promotion?.type === "bundle_price" ? event.offer_rules.promotion : null;
  const [promotionType, setPromotionType] = useState(event?.offer_rules?.promotion?.type ?? "none");
  const [discountType, setDiscountType] = useState(event?.offer_rules?.discount?.type ?? "none");

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
            <Label htmlFor="priceEur">Price (EUR) — bank transfer, foreign buyers</Label>
            <Input
              id="priceEur"
              name="priceEur"
              type="number"
              step="0.01"
              min="0"
              defaultValue={event?.price_eur ?? undefined}
              required
            />
            <p className="mt-1 text-xs text-ink/45">
              Foreign buyers see only euros and pay by bank transfer. Peruvian buyers
              see only soles and pay through Mercado Pago.
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
        <p className="text-xs text-ink/60">El +1 ocupa un cupo adicional y se incluye en el cálculo del total.</p>
        {type === "paid" && (
          <div className="space-y-5">
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-semibold">Promociones</legend>
              <Label htmlFor="promotionType">Tipo de promoción</Label>
              <Select id="promotionType" name="promotionType" value={promotionType} onChange={(e) => setPromotionType(e.target.value)}>
                <option value="none">Sin promoción</option>
                <option value="two_for_one">2x1: dos entradas por el precio de una</option>
                <option value="bundle_price">Entradas por un precio personalizado</option>
              </Select>
              {promotionType === "bundle_price" && <div className="grid gap-3 sm:grid-cols-3">
                <div><Label htmlFor="promotionQuantity">Entradas por paquete</Label><Input id="promotionQuantity" name="promotionQuantity" type="number" min="1" max="2" step="1" required defaultValue={bundle?.quantity ?? 2} /></div>
                <div><Label htmlFor="promotionAmount">Precio total del paquete</Label><Input id="promotionAmount" name="promotionAmount" type="number" min="0.01" max="999999" step="0.01" required defaultValue={bundle?.amount} placeholder="45.00" /></div>
                <div><Label htmlFor="promotionCurrency">Moneda del paquete</Label><Select id="promotionCurrency" name="promotionCurrency" defaultValue={bundle?.currency ?? "EUR"}><option value="EUR">EUR (euros)</option><option value="PEN">PEN (soles)</option></Select></div>
                <p className="text-xs text-ink/60 sm:col-span-3">El tipo de cambio se actualiza automáticamente. El comprador peruano ve el total en soles y paga por Mercado Pago; el extranjero ve el total en euros y paga por transferencia.</p>
              </div>}
              {promotionType !== "none" && <>
                <p className="text-xs text-ink/60">Para paquetes de dos entradas, activa +1. Cada entrada ocupa un cupo.</p>
                <OfferDates prefix="promotion" startsAt={event?.offer_rules?.promotion?.startsAt} endsAt={event?.offer_rules?.promotion?.endsAt} />
              </>}
              <Label htmlFor="promotions">Descripción de la promoción (opcional)</Label>
              <textarea id="promotions" name="promotions" defaultValue={event?.promotions ?? ""} rows={2} maxLength={2000} className="w-full rounded-sm border border-border px-4 py-2.5 text-sm outline-none focus-visible:border-pink" />
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-semibold">Descuentos</legend>
              <Label htmlFor="discountType">Tipo de descuento</Label>
              <Select id="discountType" name="discountType" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                <option value="none">Sin descuento</option>
                <option value="percentage">Porcentaje del total</option>
                <option value="fixed">Importe fijo en soles por compra</option>
              </Select>
              {discountType !== "none" && <>
                <Label htmlFor="discountValue">{discountType === "percentage" ? "Porcentaje (%)" : "Importe por compra (PEN)"}</Label>
                <Input id="discountValue" name="discountValue" type="number" min="0.01" max={discountType === "percentage" ? 100 : 999999} step="0.01" required defaultValue={event?.offer_rules?.discount?.value} />
                <OfferDates prefix="discount" startsAt={event?.offer_rules?.discount?.startsAt} endsAt={event?.offer_rules?.discount?.endsAt} />
              </>}
              <Label htmlFor="discounts">Descripción del descuento (opcional)</Label>
              <textarea id="discounts" name="discounts" defaultValue={event?.discounts ?? ""} rows={2} maxLength={2000} className="w-full rounded-sm border border-border px-4 py-2.5 text-sm outline-none focus-visible:border-pink" />
            </fieldset>
            <p className="text-xs text-ink/60">Las ofertas modifican el cobro durante su vigencia. No se acumulan: se aplica la opción más barata. Los importes fijos se descuentan una vez por compra y el total nunca es negativo.</p>
          </div>
        )}
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

function OfferDates({ prefix, startsAt, endsAt }: { prefix: string; startsAt?: string; endsAt?: string }) {
  // Explicit Peru time; independent of the organizer's browser timezone.
  const local = (iso?: string) => iso ? new Date(new Date(iso).getTime() - 5 * 3600000).toISOString().slice(0, 16) : "";
  return <div className="grid gap-3 sm:grid-cols-2">
    <div><Label htmlFor={`${prefix}StartsAt`}>Inicio (hora de Perú)</Label><Input id={`${prefix}StartsAt`} name={`${prefix}StartsAt`} type="datetime-local" required defaultValue={local(startsAt)} /></div>
    <div><Label htmlFor={`${prefix}EndsAt`}>Fin (hora de Perú)</Label><Input id={`${prefix}EndsAt`} name={`${prefix}EndsAt`} type="datetime-local" required defaultValue={local(endsAt)} /></div>
  </div>;
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
