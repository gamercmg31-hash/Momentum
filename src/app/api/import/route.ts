import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/session";
import { apiFailure, unauthorized } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

/**
 * Fresh installs never import old localStorage progress. Keeping this
 * endpoint as a harmless no-op prevents older browser bundles from failing.
 */
export async function POST() {
  try {
    const session = await getSessionContext();
    if (!session) return unauthorized();
    return NextResponse.json({
      ok: true,
      reset: true,
      counts: { habits: 0, logs: 0, txns: 0, xpEvents: 0 },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
