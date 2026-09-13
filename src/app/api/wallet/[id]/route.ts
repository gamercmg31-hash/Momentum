import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { deleteTxn, updateTxn } from "@/lib/server/data";
import { apiFailure, badRequest, unauthorized } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();
    const id = (await ctx.params).id;
    if (!id) return badRequest("Invalid id.");

    const body = await req.json().catch(() => null);
    const patch: Record<string, unknown> = {};
    if (typeof body?.name === "string" && body.name.trim()) {
      patch.name = body.name.trim().slice(0, 200);
    }
    if (typeof body?.category === "string") patch.category = body.category.slice(0, 60);
    if (
      typeof body?.amount === "number" &&
      Number.isFinite(body.amount) &&
      Math.abs(body.amount) <= 1_000_000_000
    ) {
      patch.amount = body.amount;
    }
    if (body?.type === "income" || body?.type === "expense") patch.type = body.type;
    if (typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      patch.date = body.date;
    }
    if (!Object.keys(patch).length) return badRequest("Nothing to update.");

    await updateTxn(me.id, id, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();
    const id = (await ctx.params).id;
    if (!id) return badRequest("Invalid id.");
    await deleteTxn(me.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiFailure(error);
  }
}
