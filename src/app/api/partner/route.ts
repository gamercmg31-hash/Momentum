import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/session";
import { getPartnerSnapshot } from "@/lib/server/data";

import { apiFailure, unauthorized } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

/** Controlled read-only partner consistency + XP/level snapshot. */
export async function GET() {
  try {
    const session = await getSessionContext();
    if (!session) return unauthorized();
    return NextResponse.json({ partner: await getPartnerSnapshot() });
  } catch (error) {
    return apiFailure(error);
  }
}
