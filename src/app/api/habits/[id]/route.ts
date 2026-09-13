import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { deleteHabit, updateHabit } from "@/lib/server/data";
import { apiFailure, badRequest, unauthorized } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();
    const id = parseId((await ctx.params).id);
    if (!id) return badRequest("Invalid id.");

    const body = await req.json().catch(() => null);
    const patch: { name?: string; icon?: string; color?: string } = {};
    if (typeof body?.name === "string" && body.name.trim()) {
      patch.name = body.name.trim().slice(0, 200);
    }
    if (typeof body?.icon === "string" && body.icon.trim()) {
      patch.icon = body.icon.slice(0, 60);
    }
    if (typeof body?.color === "string" && body.color.trim()) {
      patch.color = body.color.slice(0, 40);
    }
    if (!Object.keys(patch).length) return badRequest("Nothing to update.");

    await updateHabit(me.id, id, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();
    const id = parseId((await ctx.params).id);
    if (!id) return badRequest("Invalid id.");
    await deleteHabit(me.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiFailure(error);
  }
}
