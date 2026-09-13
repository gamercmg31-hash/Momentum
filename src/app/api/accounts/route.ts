import { NextResponse } from "next/server";
import { MAX_ACCOUNTS } from "@/lib/accounts";
import { createAccount, listAccounts } from "@/lib/server/accounts";

import { apiFailure } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
} as const;

/** Public names/colors for the two-seat picker; emails are never returned. */
export async function GET() {
  try {
    const accounts = await listAccounts();
    const seatsTaken = accounts.length;
    return NextResponse.json(
      {
        accounts,
        seatsTaken,
        slotsOpen: Math.max(0, MAX_ACCOUNTS - seatsTaken),
        maxAccounts: MAX_ACCOUNTS,
        source: "supabase" as const,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The database is unavailable." },
      { status: 503 }
    );
  }
}

/** Create one of exactly two accounts (username + password). */
export async function POST(req: Request) {
  let body: { username?: string; name?: string; password?: string; color?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const username =
    typeof body.username === "string"
      ? body.username
      : typeof body.name === "string"
        ? body.name
        : "";
  try {
    const result = await createAccount({
      username,
      password: typeof body.password === "string" ? body.password : "",
      color: typeof body.color === "string" ? body.color : undefined,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status }
      );
    }
    return NextResponse.json(
      {
        ok: true,
        user: result.user,
        requiresConfirmation: result.requiresConfirmation,
      },
      { status: 201 }
    );
  } catch (error) {
    return apiFailure(error);
  }
}
