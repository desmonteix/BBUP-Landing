"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  forgotPasswordSchema,
  loginSchema,
  profileUpdateSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validation/schemas";
import { sendPasswordReset } from "@/lib/resend";
import { getSiteUrl } from "@/lib/mercadopago";
import { verifyNationalityClaim } from "@/lib/nationalityVerification";
import { requiresNationalityApproval } from "@/lib/nationality";

export type AuthState = {
  status: "idle" | "error" | "success";
  message?: string;
  errorType?: "TypeError";
  requiresApproval?: boolean;
};

/** Invalid client-side submissions can audit their failure without invoking signup. */
export async function reportInvalidSignup(formData: FormData): Promise<AuthState> {
  return await verifyNationalityClaim({
    firstName: formData.get("firstName"), lastName: formData.get("lastName"),
    nationality: formData.get("nationality"), dniId: formData.get("dniId"), context: "signup",
  }) ?? { status: "error", message: "Check the registration form and try again." };
}

/**
 * Attendee signup (spec 5, 8). Email + password via Supabase Auth — DNI/ID
 * is written straight to `profiles` as plain data, never touched by the
 * auth system. Profile insert uses the service-role client so it succeeds
 * even when the Supabase project requires email confirmation (in which
 * case there's no session/cookie yet to satisfy the RLS "self insert"
 * policy) — this insert immediately follows a successful auth.signUp for
 * that exact user id, so bypassing RLS here is safe by construction.
 */
export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const nationalityError = await verifyNationalityClaim({
    firstName: formData.get("firstName"), lastName: formData.get("lastName"),
    nationality: formData.get("nationality"), dniId: formData.get("dniId"), context: "signup",
  });
  if (nationalityError) return nationalityError;
  const parsed = signupSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dniId: formData.get("dniId"),
    nationality: formData.get("nationality"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const admin = createAdminClient();
  if (requiresNationalityApproval(parsed.data.nationality, parsed.data.dniId)) {
    const { error: reviewUnavailable } = await admin.from("profiles").select("nationality_approval").limit(0);
    if (reviewUnavailable) return { status: "error", message: "La revisión administrativa aún no está habilitada. Contacta con la organización." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", message: error.message === "User already registered" ? "An account with this email already exists." : "Could not create your account. Try again." };
  }
  if (!data.user) {
    return { status: "error", message: "Could not create your account. Try again." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    dni_id: parsed.data.dniId.trim(),
    nationality: parsed.data.nationality,
    email: parsed.data.email,
  });

  if (profileError) {
    console.error("[auth] profile insert failed", profileError);
    return { status: "error", message: "Your account was created but we couldn't save your profile. Contact us." };
  }

  if (requiresNationalityApproval(parsed.data.nationality, parsed.data.dniId)) {
    revalidatePath("/admin/approvals");
    return { status: "success", requiresApproval: true,
      message: `Tu solicitud está pendiente de aprobación del administrador. No podrás comprar entradas hasta que se apruebe.${!data.session ? " Confirma también tu correo electrónico." : ""}` };
  }

  if (!data.session) {
    return {
      status: "success",
      message: "Check your email to confirm your account, then log in.",
    };
  }

  redirect("/account");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", message: "Incorrect email or password." };
  }

  const redirectTo = formData.get("redirect");
  redirect(typeof redirectTo === "string" && redirectTo.startsWith("/") ? redirectTo : "/account");
}

/**
 * Supabase expires a recovery token in an hour by default. Stated in the
 * email so the reader knows whether the link in an old message is worth
 * clicking; if that project setting changes, change this with it.
 */
const RESET_LINK_TTL_MINUTES = 60;

/**
 * How long one address has to wait before another link is issued.
 *
 * This is not about inbox noise. Generating a recovery link *rotates* the
 * token, so each request invalidates the one sent before it: without a floor,
 * anyone who knows an organizer's address could keep a loop running and leave
 * them permanently unable to finish a recovery.
 */
const RESET_COOLDOWN_SECONDS = 60;

/**
 * When this address last had a recovery link issued, or null if never or
 * unknown.
 *
 * Calls GoTrue directly because the JS client's `listUsers` accepts only
 * page/perPage (checked in the installed SDK's GoTrueAdminApi types) while
 * the endpoint behind it accepts `filter` — confirmed against the live
 * project, which returns just the matching user and its `recovery_sent_at`.
 *
 * Unknown reads as "allow": a hiccup here must not lock everyone out of
 * recovery, and the cost of letting an extra link through is one email.
 */
async function recoveryLastSentAt(email: string): Promise<Date | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;

  // `filter` matches substrings, not whole addresses — verified against the
  // live project, where "desmonteix" returns two accounts. So the address has
  // to be confirmed on the way out, and the page has to be wide enough that
  // the real user cannot be pushed off it: results come back newest-first, so
  // asking for one row would let a newer account whose address merely
  // *contains* this one hide it, read as "never sent", and quietly remove the
  // cooldown for the account being targeted.
  const PAGE = 100;

  try {
    const res = await fetch(
      `${base}/auth/v1/admin/users?per_page=${PAGE}&filter=${encodeURIComponent(email)}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" }
    );
    if (!res.ok) return null;

    const body = (await res.json()) as {
      users?: Array<{ email?: string; recovery_sent_at?: string | null }>;
    };
    const users = body.users ?? [];
    const match = users.find((u) => u.email?.toLowerCase() === email);

    if (!match && users.length >= PAGE) {
      // Beyond this the lookup is inconclusive rather than negative. Allowing
      // is still the right call, but it should not be invisible.
      console.warn("[auth] recovery lookup filled a full page without an exact match");
    }

    return match?.recovery_sent_at ? new Date(match.recovery_sent_at) : null;
  } catch (err) {
    console.error("[auth] could not read recovery timestamp", err);
    return null;
  }
}

/** Throttle, generate and deliver. Runs after the response has been sent. */
async function issueResetLink(email: string): Promise<void> {
  const lastSent = await recoveryLastSentAt(email);
  if (lastSent && Date.now() - lastSent.getTime() < RESET_COOLDOWN_SECONDS * 1000) {
    console.warn("[auth] reset requested again within the cooldown — ignored");
    return;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    // The ordinary case is an address with no account.
    console.warn("[auth] no reset link generated:", error?.message ?? "no token returned");
    return;
  }

  const delivered = await sendPasswordReset({
    to: email,
    resetUrl: `${getSiteUrl()}/reset-password?token_hash=${encodeURIComponent(tokenHash)}`,
    expiresInMinutes: RESET_LINK_TTL_MINUTES,
  });

  if (!delivered) {
    // The person asking was already told to check their inbox, so this line
    // is the only place the failure exists. The token stays valid and unused.
    console.error("[auth] reset link generated but could not be emailed");
  }
}

/**
 * Step one of password recovery: mail a single-use link.
 *
 * The link is generated with the service role and delivered through Resend,
 * rather than letting Supabase mail it, so recovery uses the same sender as
 * every other transactional email and does not depend on the project's SMTP
 * configuration.
 *
 * The answer is identical whether or not the address has an account —
 * otherwise this form becomes a way to ask "is this person a member?" about
 * anyone. Uniform wording alone would not do it: looking the address up and
 * mailing it takes visibly longer than finding nothing, so the work is handed
 * to `after()` and the response leaves before any of it starts. What the
 * sender sees therefore cannot depend on the outcome — including delivery
 * failures, which exist only in the logs.
 */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Enter a valid email" };
  }

  const email = parsed.data.email;
  after(async () => {
    await issueResetLink(email);
  });

  return {
    status: "success",
    message: "If that email has an account, a reset link is on its way. Check your inbox.",
  };
}

/**
 * Step two: redeem the token and set the new password.
 *
 * `verifyOtp` is what proves the person holds the emailed link — it turns the
 * token into a session, and Supabase refuses a token that is expired or
 * already spent. Only then does `updateUser` apply. Nothing here trusts a
 * user id from the form.
 */
export async function resetPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = resetPasswordSchema.safeParse({
    tokenHash: formData.get("token_hash"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }

  const supabase = await createClient();

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.tokenHash,
    type: "recovery",
  });

  if (verifyError) {
    return {
      status: "error",
      message: "This link has expired or was already used. Request a new one.",
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (updateError) {
    // The token was spent by verifyOtp above, so resubmitting this form can
    // only fail — point at a fresh link rather than inviting a retry that
    // cannot work. Supabase refuses here when the new password matches the
    // old one, which is exactly what a half-remembered password produces.
    console.error("[auth] password update failed after recovery", updateError.message);
    return {
      status: "error",
      message:
        "Couldn't set that password — it may be the one you already had. Request a new link and try a different password.",
    };
  }

  // Someone resetting because they think their account was taken expects the
  // intruder to be thrown out. A new password alone does not do that: existing
  // refresh tokens keep working. Drop every other session, keep this one.
  const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
  if (signOutError) {
    console.error("[auth] could not revoke other sessions after reset", signOutError.message);
  }

  redirect("/account");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function updateProfile(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Log in to update your profile." };
  const nationalityError = await verifyNationalityClaim({
    firstName: formData.get("firstName"), lastName: formData.get("lastName"),
    nationality: formData.get("nationality"), dniId: formData.get("dniId"),
    profileId: user.id, context: "profile",
  });
  if (nationalityError) return nationalityError;
  const parsed = profileUpdateSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    nationality: formData.get("nationality"),
    dniId: formData.get("dniId"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { data: updatedProfile, error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      nationality: parsed.data.nationality,
      dni_id: parsed.data.dniId.trim(),
    })
    .eq("id", user.id)
    .select("nationality_approval")
    .single();

  if (error) {
    console.error("[auth] profile update failed", error);
    return { status: "error", message: "Could not save your changes. Try again." };
  }

  revalidatePath("/account");
  revalidatePath("/events");
  revalidatePath("/admin/approvals");
  return { status: "success", message: updatedProfile?.nationality_approval === "pending"
    ? "Perfil actualizado. Tu cuenta queda pendiente de aprobación del administrador."
    : updatedProfile?.nationality_approval === "rejected" ? "Perfil actualizado. El administrador no ha aprobado esta cuenta."
    : "Profile updated." };
}
