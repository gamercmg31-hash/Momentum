import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { supabaseFetch } from "@/lib/supabase/transport";

/**
 * Refreshes Supabase Auth cookies before Server Components and Route Handlers
 * run. `proxy.ts` is the Next.js 16 replacement for the deprecated middleware
 * convention and is fully supported by Vercel.
 */
export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      global: { fetch: supabaseFetch },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Make the refreshed token visible to the current request and return
          // every rotated cookie to the browser for subsequent requests.
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  try {
    // Validate the token and refresh it when necessary. Authorization still
    // happens in Route Handlers and Supabase Row Level Security.
    await supabase.auth.getClaims();
  } catch {
    // A temporary Supabase outage must not make every application route fail;
    // the API endpoint handling the request returns the useful error instead.
  }

  return response;
}

export const config = {
  matcher: [
    // Exclude Next.js assets, image files, and the platform health probe.
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
