import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { createTxn } from "@/lib/server/data";
import type { Txn } from "@/lib/wallet";
import { apiFailure, badRequest, unauthorized } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();

    const body = await req.json().catch(() => null);
    const t = body?.txn as Txn | undefined;
    if (
      !t ||
      typeof t.id !== "string" ||
      !t.id ||
      t.id.length > 80 ||
      typeof t.name !== "string" ||
      !t.name.trim() ||
      typeof t.amount !== "number" ||
      !Number.isFinite(t.amount) ||
      Math.abs(t.amount) > 1_000_000_000 ||
      (t.type !== "income" && t.type !== "expense") ||
      typeof t.category !== "string" ||
      typeof t.date !== "string" ||
      !DATE_RE.test(t.date)
    ) {
      return badRequest("Invalid transaction.");
    }
    const txn = await createTxn(me.id, {
      ...t,
      name: t.name.trim().slice(0, 200),
      category: t.category.slice(0, 60),
      createdAt: t.createdAt || Date.now(),
    });
    return NextResponse.json({ txn });
  } catch (error) {
    return apiFailure(error);
  }
}
