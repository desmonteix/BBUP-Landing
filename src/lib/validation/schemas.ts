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
});

export const culqiChargeSchema = z.object({
  registrationId: z.string().uuid(),
  culqiTokenId: z.string().min(1),
});

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
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
    eventDate: z.string().min(1, "Date is required"),
    location: z.string().trim().min(1, "Location is required").max(200),
    type: z.enum(["free", "paid"]),
    category: z.enum(COMMITTEE_KEYS as [string, ...string[]]),
    pricePen: z.coerce.number().positive().optional(),
    priceUsd: z.coerce.number().positive().optional(),
    capacity: z.coerce.number().int().positive().optional(),
    status: z.enum(["open", "closed"]),
  })
  .refine(
    (data) =>
      data.type === "free" ||
      (data.pricePen !== undefined && data.priceUsd !== undefined),
    {
      message: "Paid events require both a PEN and a USD price",
      path: ["pricePen"],
    }
  );

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RsvpInput = z.infer<typeof rsvpSchema>;
export type NewsletterInput = z.infer<typeof newsletterSchema>;
export type EventFormInput = z.infer<typeof eventFormSchema>;
