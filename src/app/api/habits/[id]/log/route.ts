import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { setLog } from "@/lib/server/data";
import { apiFailure, badRequest, unauthorized } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();

    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) return badRequest("Invalid id.");

    const body = await req.json().catch(() => null);
    const date = body?.date;
    const status = body?.status;
    if (typeof date !== "string" || !DATE_RE.test(date)) {
      return badRequest("Invalid date.");
    }
    if (status !== "completed" && status !== "skipped" && status !== null) {
      return badRequest("Invalid status.");
    }
    await setLog(me.id, id, date, status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiFailure(error);
  }
}
