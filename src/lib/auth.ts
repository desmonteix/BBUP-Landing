import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Nationality, Profile } from "@/lib/types";

/** Current authenticated attendee's profile, or null if signed out. Server-only. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, dni_id, nationality, email, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}

export async function getCurrentNationality(): Promise<Nationality | null> {
  const profile = await getCurrentProfile();
  return (profile?.nationality as Nationality) ?? null;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return Boolean(data);
}

export async function requireAdmin() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Not authorized");
  }
}
