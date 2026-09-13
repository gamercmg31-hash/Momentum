import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { restoreUser, type BackupDump } from "@/lib/server/data";
import { apiFailure, badRequest, unauthorized } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

/**
 * Restore the signed-in user's data from a backup file.
 * Replaces only the caller's own rows — Row Level Security makes it
 * impossible for this to touch the partner's data.
 */
export async function POST(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();

    const dump = (await req.json().catch(() => null)) as BackupDump | null;
    if (
      !dump ||
      dump.format !== "momentum-backup" ||
      dump.version !== 1 ||
      !Array.isArray(dump.habits) ||
      !Array.isArray(dump.logs) ||
      !Array.isArray(dump.txns) ||
      !Array.isArray(dump.xpEvents)
    ) {
      return badRequest("That file is not a valid Momentum backup.");
    }
    await restoreUser(me.id, dump);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiFailure(error);
  }
}
