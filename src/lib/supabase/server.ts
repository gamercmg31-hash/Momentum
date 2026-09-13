import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  assertSupabaseConfigured,
} from "@/lib/supabase/config";
import { supabaseFetch } from "@/lib/supabase/transport";

/**
 * Request-scoped Supabase client for Server Components and Route Handlers.
 *
 * The Supabase Auth session lives in HttpOnly cookies. Every database query
 * therefore runs as the signed-in user and is authorized by the RLS policies
 * in `supabase/schema.sql`.
 */
export async function getSupabaseServer(): Promise<SupabaseClient> {
  assertSupabaseConfigured();
  const store = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { fetch: supabaseFetch },
    cookies: {
      getAll() {
        return store.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        } catch {
          // Server Components cannot mutate cookies. The proxy refreshes and
          // persists the session before rendering, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Anonymous Supabase client used only by the pre-login seat picker. It can
 * read the `public_profiles` view and nothing private; Supabase RLS/grants are
 * the final authority.
 */
export function getSupabaseAnon(): SupabaseClient {
  assertSupabaseConfigured();
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { fetch: supabaseFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
