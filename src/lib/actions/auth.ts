"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginSchema, profileUpdateSchema, signupSchema } from "@/lib/validation/schemas";

export type AuthState = {
  status: "idle" | "error" | "success";
  message?: string;
};

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

  const admin = createAdminClient();
  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    dni_id: parsed.data.dniId,
    nationality: parsed.data.nationality,
    email: parsed.data.email,
  });

  if (profileError) {
    console.error("[auth] profile insert failed", profileError);
    return { status: "error", message: "Your account was created but we couldn't save your profile. Contact us." };
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

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function updateProfile(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = profileUpdateSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    nationality: formData.get("nationality"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Log in to update your profile." };

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      nationality: parsed.data.nationality,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[auth] profile update failed", error);
    return { status: "error", message: "Could not save your changes. Try again." };
  }

  return { status: "success", message: "Profile updated." };
}
