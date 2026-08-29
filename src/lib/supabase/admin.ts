import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * Server-only, never import into a Client Component ("server-only" throws a
 * build error if that happens). Used for:
 *  - inserting anonymous free RSVPs (no authenticated session to satisfy RLS)
 *  - inserting/updating ticket registrations after server-side validation
 *  - the Mercado Pago webhook (no user session present)
 *  - the daily BCRP exchange-rate cron job
 *  - admin panel reads/writes after an explicit `isAdmin()` check
 *
 * Every call site MUST perform its own authorization check before using
 * this client — it will happily read/write anything.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      // All app tables live in the `pagina_web` schema, not `public` — see
      // supabase/migrations. Auth itself is unaffected (always `auth`
      // schema regardless of this setting).
      db: { schema: "pagina_web" },
    }
  );
}
