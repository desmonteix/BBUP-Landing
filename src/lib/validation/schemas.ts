import { z } from "zod";
import { NATIONALITIES } from "@/lib/types";
import { COMMITTEE_KEYS } from "@/lib/committees";

/**
 * Server-side validation schemas. Every Server Action / Route Handler that
 * accepts user input parses it through one of these — client-side
 * validation (in the form components) is UX only, never trusted alone.
 */

export const signupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  dniId: z
    .string()
    .trim()
    .min(4, "Enter a valid ID/passport number")
    .max(30),
  nationality: z.enum(NATIONALITIES as [string, ...string[]]),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

/** Same floor as signup — a reset must not be a way around the password rule. */
export const resetPasswordSchema = z.object({
  // Capped like every other string here rather than forwarded unbounded to
  // the auth API. Supabase's hashes run ~56 characters; 512 is slack.
  tokenHash: z.string().min(1).max(512),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  nationality: z.enum(NATIONALITIES as [string, ...string[]]),
});

export const rsvpSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export const ticketIntentSchema = z.object({
  eventId: z.string().uuid(),
  accepted: z.literal(true, { errorMap: () => ({ message: "Accept the event terms and conditions before buying." }) }),
  expectedAmountPen: z.number().nonnegative().optional(),
  version: z.string().regex(/^[a-f0-9]{64}$/, "Reload the event and accept its terms."),
  companion: z.object({
    firstName: z.string().trim().min(1, "Companion first name is required").max(100),
    lastName: z.string().trim().min(1, "Companion last name is required").max(100),
  }).optional(),
});

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

const offerWindow = {
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
};
export const offerRulesSchema = z.object({
  promotion: z.discriminatedUnion("type", [
    z.object({ ...offerWindow, type: z.literal("two_for_one") }),
    z.object({ ...offerWindow, type: z.literal("bundle_price"), quantity: z.union([z.literal(1), z.literal(2)]), amount: z.number().positive().max(999999).multipleOf(0.01), currency: z.enum(["PEN", "EUR"]) }),
  ])
    .refine((data) => Date.parse(data.endsAt) > Date.parse(data.startsAt), "Promotion end must be after its start.").optional(),
  discount: z.object({ ...offerWindow, type: z.enum(["percentage", "fixed"]), value: z.number().positive().max(999999) })
    .refine((data) => data.type !== "percentage" || data.value <= 100, "Percentage discounts cannot exceed 100%.")
    .refine((data) => Date.parse(data.endsAt) > Date.parse(data.startsAt), "Discount end must be after its start.").optional(),
});

export const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    slug: z
      .string()
      .trim()
      .min(1, "Slug is required")
      .max(200)
      .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
    description: z.string().trim().min(1, "Description is required"),
    coverImage: z.string().trim().url().optional().or(z.literal("")),
    eventDate: z.string().min(1, "Date is required").refine((value) => Number.isFinite(new Date(value).getTime()), "Enter a valid date"),
    location: z.string().trim().min(1, "Location is required").max(200),
    type: z.enum(["free", "paid"]),
    category: z.enum(COMMITTEE_KEYS as [string, ...string[]]),
    pricePen: z.coerce.number().positive().optional(),
    priceEur: z.coerce.number().positive().optional(),
    capacity: z.coerce.number().int().positive().optional(),
    status: z.enum(["open", "closed"]),
    allowCompanion: z.boolean().default(false),
    promotions: z.string().trim().max(2000).default(""),
    discounts: z.string().trim().max(2000).default(""),
    offerRules: offerRulesSchema.default({}),
    termsText: z.string().trim().max(20000).default(""),
    termsUrl: z.string().trim().max(2000).refine((value) => {
      if (!value) return true;
      try { return ["http:", "https:"].includes(new URL(value).protocol); }
      catch { return false; }
    }, "Use an HTTP or HTTPS link for the terms.").default(""),
  })
  .refine((data) => !data.offerRules.promotion || (data.type === "paid" && (data.offerRules.promotion.type === "bundle_price" && data.offerRules.promotion.quantity === 1 || data.allowCompanion)), {
    message: "Two-ticket promotions require a paid event with +1 enabled.", path: ["offerRules"],
  })
  .refine((data) => data.type === "free" || Boolean(data.termsText || data.termsUrl), {
    message: "Paid events require terms and conditions as text or a link.",
    path: ["termsText"],
  })
  .refine(
    (data) =>
      data.type === "free" ||
      (data.pricePen !== undefined && data.priceEur !== undefined),
    {
      message: "Paid events require both a PEN and a EUR price",
      path: ["pricePen"],
    }
  );

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RsvpInput = z.infer<typeof rsvpSchema>;
export type NewsletterInput = z.infer<typeof newsletterSchema>;
export type EventFormInput = z.infer<typeof eventFormSchema>;
