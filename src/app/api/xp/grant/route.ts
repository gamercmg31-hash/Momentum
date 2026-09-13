import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { grantXp, type ServerGrant } from "@/lib/server/data";
import { dateKey } from "@/lib/dates";
import { apiFailure, badRequest, unauthorized } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

/**
 * Idempotent XP grants. The client proposes awards with their idempotency
 * keys; the server writes only keys it has never seen for this user, so
 * retries, double-clicks and re-imports can never duplicate XP.
 */
export async function POST(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();

    const body = await req.json().catch(() => null);
    const grants = body?.grants as ServerGrant[] | undefined;
    if (!Array.isArray(grants) || grants.length > 50) {
      return badRequest("Invalid grants.");
    }
    const result = await grantXp(me.id, grants, dateKey(new Date()), Date.now());
    return NextResponse.json(result);
  } catch (error) {
    return apiFailure(error);
  }
}
