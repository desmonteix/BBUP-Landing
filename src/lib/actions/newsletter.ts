"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { newsletterSchema } from "@/lib/validation/schemas";

export type NewsletterState = {
  status: "idle" | "success" | "error";
  message?: string;
};

/**
 * Newsletter capture only — no campaign sending (spec §2, §8). Inserts go
 * through the service-role client because there is no attendee session
 * requirement for signing up to the newsletter.
 */
export async function subscribeToNewsletter(
  _prev: NewsletterState,
  formData: FormData
): Promise<NewsletterState> {
  const parsed = newsletterSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter a valid email",
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .upsert({ email: parsed.data.email }, { onConflict: "email" });

  if (error) {
    console.error("[newsletter] insert failed", error);
    return { status: "error", message: "Something went wrong. Try again in a moment." };
  }

  return { status: "success", message: "You're on the list — welcome!" };
}
