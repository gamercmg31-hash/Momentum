import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/server/session";
import { apiFailure, badRequest, unauthorized } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

/**
 * Change the signed-in owner's password through Supabase Auth.
 * The current password is re-verified first so a hijacked tab cannot rotate it.
 */
export async function POST(req: Request) {
  try {
    const session = await getSessionContext();
    if (!session) return unauthorized();
    if (!session.email) {
      return badRequest(
        "This account has no sign-in address in Supabase Auth, so the password cannot be changed here."
      );
    }

    const body = (await req.json().catch(() => null)) as {
      currentPassword?: string;
      newPassword?: string;
    } | null;
    const currentPassword =
      typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (newPassword.length < 6 || newPassword.length > 100) {
      return badRequest("New password must be 6–100 characters.");
    }
    if (newPassword === currentPassword) {
      return badRequest("The new password must be different from the current one.");
    }

    const supabase = await getSupabaseServer();
    // Re-authenticate. This also refreshes the cookie session for the same
    // user, so the caller stays signed in after the rotation.
    const check = await supabase.auth.signInWithPassword({
      email: session.email,
      password: currentPassword,
    });
    if (check.error || !check.data.user) {
      return NextResponse.json(
        { ok: false, error: "Current password is wrong." },
        { status: 401 }
      );
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return badRequest(error.message || "Could not update the password.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiFailure(error);
  }
}
