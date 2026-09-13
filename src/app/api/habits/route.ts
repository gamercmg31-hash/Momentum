import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { createHabit } from "@/lib/server/data";
import { apiFailure, badRequest, unauthorized } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();

    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 200) : "";
    const icon = typeof body?.icon === "string" ? body.icon.slice(0, 60) : "";
    const color = typeof body?.color === "string" ? body.color.slice(0, 40) : "";
    if (!name || !icon || !color) return badRequest("Invalid habit.");

    const habit = await createHabit(me.id, { name, icon, color });
    return NextResponse.json({ habit });
  } catch (error) {
    return apiFailure(error);
  }
}
