import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/session";
import {
  ensureSeeded,
  getHabits,
  getLogs,
  getOwnedProgressDetails,
  getPartnerSnapshot,
  getProgressState,
  getTxns,
  getXpEvents,
} from "@/lib/server/data";

import { apiFailure, unauthorized } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

/** Hydrate the complete database-persisted Momentum experience. */
export async function GET() {
  try {
    const session = await getSessionContext();
    if (!session) return unauthorized();
    const me = session.user;
    await ensureSeeded(me.id);
    const [habits, logs, txns, xpEvents, progress, progressDetails, partner] =
      await Promise.all([
        getHabits(me.id),
        getLogs(me.id),
        getTxns(me.id),
        getXpEvents(me.id),
        getProgressState(me.id),
        getOwnedProgressDetails(me.id),
        getPartnerSnapshot(),
      ]);
    return NextResponse.json({
      me,
      slice: { seeded: true, habits, logs },
      txns,
      xp: {
        totalXp: progress.totalXp,
        level: progress.level,
        events: xpEvents,
        quests: progressDetails.quests,
        achievements: progressDetails.achievements,
      },
      partner,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
