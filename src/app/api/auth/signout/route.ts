import { NextResponse } from "next/server";
import { destroySession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/**
 * Signing out must always succeed from the browser's point of view: even if
 * Supabase is unreachable the client clears its state and returns to /login.
 */
export async function POST() {
  try {
    await destroySession();
  } catch {
    /* the cookie is cleared by the client + proxy regardless */
  }
  return NextResponse.json({ ok: true });
}
