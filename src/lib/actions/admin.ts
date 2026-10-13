"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventFormSchema } from "@/lib/validation/schemas";
import { recordExchangeRate } from "@/lib/exchangeRate";

export type AdminFormState = {
  status: "idle" | "error";
  message?: string;
};

/**
 * Every mutation below re-checks `isCurrentUserAdmin()` itself rather than
 * trusting that the caller only renders these forms behind the admin
 * layout — the layout gate stops navigation, not a forged request, so the
 * authorization check has to live at the action/route boundary too.
 */
async function assertAdmin() {
  const ok = await isCurrentUserAdmin();
  if (!ok) throw new Error("Not authorized.");
}

function parseEventForm(formData: FormData) {
  // Offer schedules use Peru time explicitly, including when deployed in UTC.
  const date = (name: string) => `${formData.get(name) ?? ""}:00-05:00`;
  const paid = formData.get("type") === "paid";
  const promotionType = formData.get("promotionType");
  const discountType = formData.get("discountType");
  return eventFormSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    coverImage: formData.get("coverImage") || "",
    eventDate: formData.get("eventDate"),
    location: formData.get("location"),
    type: formData.get("type"),
    category: formData.get("category"),
    pricePen: formData.get("pricePen") || undefined,
    priceUsd: formData.get("priceUsd") || undefined,
    capacity: formData.get("capacity") || undefined,
    status: formData.get("status"),
    allowCompanion: formData.get("allowCompanion") === "on",
    promotions: formData.get("promotions") || "",
    discounts: formData.get("discounts") || "",
    offerRules: {
      promotion: paid && promotionType === "two_for_one" ? { type: promotionType, startsAt: date("promotionStartsAt"), endsAt: date("promotionEndsAt") } : undefined,
      discount: paid && (discountType === "percentage" || discountType === "fixed") ? { type: discountType, value: Number(formData.get("discountValue")), startsAt: date("discountStartsAt"), endsAt: date("discountEndsAt") } : undefined,
    },
    termsText: formData.get("termsText") || "",
    termsUrl: formData.get("termsUrl") || "",
  });
}

export async function createEvent(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await assertAdmin();

  const parsed = parseEventForm(formData);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("events").insert({
    title: parsed.data.title,
    slug: parsed.data.slug,
    description: parsed.data.description,
    cover_image: parsed.data.coverImage || null,
    event_date: new Date(parsed.data.eventDate).toISOString(),
    location: parsed.data.location,
    type: parsed.data.type,
    category: parsed.data.category,
    price_pen: parsed.data.type === "paid" ? parsed.data.pricePen : null,
    price_usd: parsed.data.type === "paid" ? parsed.data.priceUsd : null,
    capacity: parsed.data.capacity ?? null,
    status: parsed.data.status,
    allow_companion: parsed.data.allowCompanion,
    promotions: parsed.data.promotions,
    discounts: parsed.data.discounts,
    offer_rules: parsed.data.offerRules,
    terms_text: parsed.data.termsText,
    terms_url: parsed.data.termsUrl,
  });

  if (error) {
    console.error("[admin] createEvent failed", error);
    return {
      status: "error",
      message: error.code === "23505" ? "That slug is already in use." : "Could not create the event.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/events");
  redirect("/admin");
}

export async function updateEvent(
  eventId: string,
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await assertAdmin();

  const parsed = parseEventForm(formData);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("events")
    .update({
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description,
      cover_image: parsed.data.coverImage || null,
      event_date: new Date(parsed.data.eventDate).toISOString(),
      location: parsed.data.location,
      type: parsed.data.type,
      category: parsed.data.category,
      price_pen: parsed.data.type === "paid" ? parsed.data.pricePen : null,
      price_usd: parsed.data.type === "paid" ? parsed.data.priceUsd : null,
      capacity: parsed.data.capacity ?? null,
      status: parsed.data.status,
      allow_companion: parsed.data.allowCompanion,
      promotions: parsed.data.promotions,
      discounts: parsed.data.discounts,
      offer_rules: parsed.data.offerRules,
      terms_text: parsed.data.termsText,
      terms_url: parsed.data.termsUrl,
    })
    .eq("id", eventId);

  if (error) {
    console.error("[admin] updateEvent failed", error);
    return {
      status: "error",
      message: error.code === "23505" ? "That slug is already in use." : "Could not save changes.",
    };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/events");
  return { status: "idle", message: "Saved." };
}

export async function toggleEventStatus(eventId: string, nextStatus: "open" | "closed") {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.from("events").update({ status: nextStatus }).eq("id", eventId);
  revalidatePath("/admin");
  revalidatePath("/events");
}

export type ExchangeRateFormState = {
  status: "idle" | "error";
  message?: string;
};

/**
 * Manual fallback for the daily BCRP cron (spec §5, §11) — an organizer can
 * set today's USD -> PEN rate by hand if the automated job is down for an
 * extended period. Inserts a new `source='manual_override'` row rather
 * than mutating one in place, same append-only pattern the cron job uses,
 * so it still shows up correctly in any receipt's audit trail.
 */
export async function setManualExchangeRate(
  _prev: ExchangeRateFormState,
  formData: FormData
): Promise<ExchangeRateFormState> {
  await assertAdmin();

  const raw = formData.get("rate");
  const parsed = typeof raw === "string" ? Number(raw) : NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { status: "error", message: "Enter a positive number, e.g. 3.75." };
  }

  // Normalize to the 3 decimals every display uses. The input's step="0.001"
  // is only a client-side hint, so without this a rate submitted with more
  // precision would be charged at a value the panel never shows.
  const rate = Math.round(parsed * 1000) / 1000;
  if (rate <= 0) {
    return { status: "error", message: "Enter a rate of at least 0.001." };
  }

  const result = await recordExchangeRate(rate, "manual_override");
  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidatePath("/admin");
  return { status: "idle", message: "Exchange rate updated." };
}
