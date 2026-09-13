import { NextResponse } from "next/server";

/**
 * Turns any thrown value into a predictable JSON response.
 *
 * Every Momentum route must answer with JSON, never with Next.js' default
 * HTML 500 page: the browser client parses `error` out of the body and the
 * whole "Supabase is not configured on this deployment" experience depends on
 * it. `getSupabaseServer()` throws when the environment variables are missing
 * or wrong, and `requireSession()` throws "Unauthorized", so both paths are
 * mapped to the right status code here.
 */
export function apiFailure(error: unknown): NextResponse {
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Unexpected server error.";

  if (/^unauthorized$/i.test(message.trim())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Configuration / connectivity / missing-schema problems are "try again or
  // fix your deployment", not application bugs.
  const unavailable =
    /NEXT_PUBLIC_SUPABASE|Supabase is not configured|is missing|unreachable|unavailable|fetch failed|network|timed? ?out|tables are missing|tables do not exist|schema\.sql|schema cache|does not exist/i.test(
      message
    );

  return NextResponse.json(
    { error: message },
    { status: unavailable ? 503 : 500 }
  );
}

/** `401` helper used by every authenticated route. */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** `400` helper for request validation. */
export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}
