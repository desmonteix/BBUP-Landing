import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components (browser). Only ever uses the
 * public anon key — safe to ship in the client bundle.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // All app tables live in the `pagina_web` schema, not `public` — see
    // supabase/migrations. Auth itself is unaffected.
    { db: { schema: "pagina_web" } }
  );
}
