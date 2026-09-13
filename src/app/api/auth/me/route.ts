import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** Always returns JSON, including configuration or Supabase transport failures. */
export async function GET() {
  try {
    const user = await getSessionUser();
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      {
        user: null,
        error:
          error instanceof Error
            ? error.message
            : "Could not connect to Supabase Auth.",
      },
      { status: 503 }
    );
  }
}
