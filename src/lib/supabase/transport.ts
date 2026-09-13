import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  getSupabaseConfigurationStatus,
} from "@/lib/supabase/config";

const JSON_CONTENT_TYPES = ["application/json", "application/openapi+json"];

function isJsonContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase();
  return JSON_CONTENT_TYPES.some((type) => normalized.includes(type)) || normalized.includes("+json");
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

/**
 * Fetch implementation supplied to every Supabase client.
 *
 * Supabase Auth and PostgREST expect JSON. A Vercel URL, dashboard URL, reverse
 * proxy, or hosting error page returns HTML instead; the SDK then reports the
 * unhelpful `Unexpected token '<'`. Convert that response into a normal
 * Supabase-shaped JSON error while preserving all real JSON responses.
 */
export async function supabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 204) return response;

  const contentType = response.headers.get("content-type") ?? "";
  if (isJsonContentType(contentType)) return response;

  let preview = "";
  try {
    preview = (await response.clone().text()).trimStart().slice(0, 80);
  } catch {
    return response;
  }

  const html = contentType.toLowerCase().includes("text/html") || preview.startsWith("<");
  if (!html) return response;

  let host = "configured host";
  try {
    host = new URL(response.url || requestUrl(input)).hostname;
  } catch {
    /* keep safe fallback */
  }

  const message =
    `Supabase returned an HTML page from ${host} (HTTP ${response.status}). ` +
    "NEXT_PUBLIC_SUPABASE_URL must be the Supabase Project URL, such as " +
    "https://your-project-ref.supabase.co — not the Vercel site URL or Supabase dashboard URL.";

  return new Response(
    JSON.stringify({
      code: "SUPABASE_NON_JSON_RESPONSE",
      message,
      error: message,
      details: "The response began with HTML instead of JSON.",
      hint: `Copy the Project URL from Supabase Dashboard → Connect. Current configured origin: ${SUPABASE_URL || "missing"}.`,
    }),
    {
      // A 200 HTML website must become an error for the Supabase SDK.
      status: response.ok ? 502 : response.status,
      statusText: response.ok ? "Bad Gateway" : response.statusText,
      headers: { "content-type": "application/json; charset=utf-8" },
    }
  );
}

export interface SupabaseProbeResult {
  ok: boolean;
  error: string | null;
  httpStatus: number | null;
  contentType: string | null;
}

/**
 * Diagnostics fetch with a tiny retry budget.
 *
 * Supabase edge nodes occasionally answer a health/settings probe with a
 * transient 5xx (`Gateway Timeout`). Those blips must not be reported as a
 * broken deployment, so the probe is retried briefly before giving up.
 * Real configuration problems (4xx, HTML pages, wrong host) are returned
 * immediately and unchanged.
 */
async function fetchWithRetry(
  request: () => Promise<Response>,
  attempts = 3,
  delayMs = 350
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await request();
      if (response.status < 500 || attempt === attempts) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      // An aborted request used the caller's timeout budget: do not retry.
      if (error instanceof Error && error.name === "AbortError") throw error;
      if (attempt === attempts) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("network request failed");
}

export interface SupabaseAuthConfigurationResult {
  ok: boolean;
  signupsEnabled: boolean | null;
  emailConfirmationDisabled: boolean | null;
  error: string | null;
}

/** Reads the public GoTrue settings needed by Momentum's username signup. */
export async function readSupabaseAuthConfiguration(): Promise<SupabaseAuthConfigurationResult> {
  const configuration = getSupabaseConfigurationStatus();
  if (!configuration.valid) {
    return {
      ok: false,
      signupsEnabled: null,
      emailConfirmationDisabled: null,
      error: configuration.error,
    };
  }

  try {
    const response = await fetchWithRetry(() =>
      supabaseFetch(`${SUPABASE_URL}/auth/v1/settings`, {
        method: "GET",
        headers: {
          accept: "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
        cache: "no-store",
      })
    );
    const text = await response.text();
    const payload = JSON.parse(text) as {
      disable_signup?: boolean;
      mailer_autoconfirm?: boolean;
      external?: { email?: boolean };
      message?: string;
      error?: string;
    };

    if (!response.ok) {
      return {
        ok: false,
        signupsEnabled: null,
        emailConfirmationDisabled: null,
        error:
          payload.message ||
          payload.error ||
          `Supabase Auth settings request failed (HTTP ${response.status}).`,
      };
    }

    return {
      ok: true,
      signupsEnabled:
        payload.disable_signup !== true && payload.external?.email !== false,
      emailConfirmationDisabled: payload.mailer_autoconfirm === true,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      signupsEnabled: null,
      emailConfirmationDisabled: null,
      error:
        error instanceof Error
          ? error.message
          : "Could not read Supabase Auth settings.",
    };
  }
}

/**
 * Directly checks the project's Auth health endpoint before querying tables.
 * This distinguishes bad configuration/HTML redirects from schema or RLS
 * errors, without exposing the public key in the response.
 */
export async function probeSupabaseEndpoint(): Promise<SupabaseProbeResult> {
  const configuration = getSupabaseConfigurationStatus();
  if (!configuration.valid) {
    return {
      ok: false,
      error: configuration.error,
      httpStatus: null,
      contentType: null,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const endpoint = `${SUPABASE_URL}/auth/v1/health`;
    const response = await fetchWithRetry(() =>
      fetch(endpoint, {
        method: "GET",
        headers: {
          accept: "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
      })
    );
    const contentType = response.headers.get("content-type") ?? "";

    if (response.status >= 300 && response.status < 400) {
      return {
        ok: false,
        error:
          `NEXT_PUBLIC_SUPABASE_URL redirected at /auth/v1/health (HTTP ${response.status}). ` +
          "Use the direct Project URL from Supabase Dashboard → Connect, not a website or proxy URL.",
        httpStatus: response.status,
        contentType: contentType || null,
      };
    }

    const text = await response.text();
    const startsWithHtml = text.trimStart().startsWith("<");
    if (!isJsonContentType(contentType) || startsWithHtml) {
      return {
        ok: false,
        error:
          `NEXT_PUBLIC_SUPABASE_URL returned ${startsWithHtml ? "HTML" : "a non-JSON response"} ` +
          `from /auth/v1/health (HTTP ${response.status}, ${contentType || "no content-type"}). ` +
          "It is not the correct Supabase Project URL. Copy the URL ending in .supabase.co from Supabase Dashboard → Connect.",
        httpStatus: response.status,
        contentType: contentType || null,
      };
    }

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return {
        ok: false,
        error:
          "The configured Supabase Auth endpoint claimed to return JSON but sent invalid JSON. Check the Project URL and Supabase status.",
        httpStatus: response.status,
        contentType: contentType || null,
      };
    }

    if (!response.ok) {
      const detail =
        payload && typeof payload === "object"
          ? String(
              (payload as { message?: unknown; error?: unknown; msg?: unknown }).message ??
                (payload as { error?: unknown }).error ??
                (payload as { msg?: unknown }).msg ??
                response.statusText
            )
          : response.statusText;
      return {
        ok: false,
        error: `Supabase Auth health check failed (HTTP ${response.status}): ${detail}`,
        httpStatus: response.status,
        contentType: contentType || null,
      };
    }

    return {
      ok: true,
      error: null,
      httpStatus: response.status,
      contentType: contentType || null,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      error: aborted
        ? "Supabase did not answer within 12 seconds. Check whether the project is paused or unavailable."
        : `Could not connect to the configured Supabase Project URL: ${
            error instanceof Error ? error.message : "network request failed"
          }`,
      httpStatus: null,
      contentType: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
