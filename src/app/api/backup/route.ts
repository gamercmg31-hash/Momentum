import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { exportUser } from "@/lib/server/data";
import { apiFailure, unauthorized } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

/** Download a complete JSON backup of the signed-in user's data. */
export async function GET() {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();

    const dump = await exportUser(me.id);
    const stamp = new Date().toISOString().slice(0, 10);
    const safeName =
      me.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") ||
      "account";
    return new NextResponse(JSON.stringify(dump, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="momentum-backup-${safeName}-${stamp}.json"`,
      },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
