// Typed fetch helpers for Momentum's same-origin API routes.
// Cookies (the Supabase session) flow automatically with every request.

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function htmlResponseMessage(path: string, status: number): string {
  return (
    `The app API returned HTML instead of JSON for ${path} (HTTP ${status}). ` +
    "This is a Vercel routing/deployment response, not a Supabase JSON response. " +
    "Redeploy the Next.js project and verify the Supabase environment variables are enabled for this Vercel environment."
  );
}

async function readJson<T>(response: Response, path: string): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new ApiError(
      `The app API returned an empty response for ${path} (HTTP ${response.status}).`,
      response.status || 502
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const html = text.trimStart().startsWith("<");
    throw new ApiError(
      html
        ? htmlResponseMessage(path, response.status)
        : `The app API returned invalid JSON for ${path} (HTTP ${response.status}).`,
      response.status || 502
    );
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = await readJson<T & { error?: string }>(response, path);
  if (!response.ok) {
    const message =
      typeof data?.error === "string" && data.error
        ? data.error
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }
  return data as T;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * GET helper for cold-start-sensitive reads. Preview/serverless runtimes can
 * need a few seconds to wake up; retry network errors and 5xx responses, but
 * never retry real client/auth errors (400/401/403/404/409).
 */
export async function apiWithWakeRetry<T>(
  path: string,
  attempts = 6
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await api<T>(path);
    } catch (error) {
      lastError = error;
      const schemaMissing =
        error instanceof Error &&
        (/relation .* does not exist/i.test(error.message) ||
          /tables are missing|tables do not exist|schema\.sql/i.test(error.message));
      const retryable =
        !schemaMissing && (!(error instanceof ApiError) || error.status >= 500);
      if (!retryable || attempt === attempts - 1) throw error;
      // 1s, 2s, 3s, 4s, 5s — enough time for the runtime + Supabase to wake.
      await wait((attempt + 1) * 1000);
    }
  }
  throw lastError;
}
