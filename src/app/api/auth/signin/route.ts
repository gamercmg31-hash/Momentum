import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  SCHEMA_MISSING_MESSAGE,
  isMissingSchemaError,
} from "@/lib/supabase/config";
import { emailForUsername } from "@/lib/username";

export const dynamic = "force-dynamic";

/** Sign in through Supabase Auth. The session lands in HttpOnly cookies. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    username?: string;
    email?: string;
    password?: string;
    selectedUserId?: string;
  } | null;

  const rawUsername =
    typeof body?.username === "string" ? body.username.trim() : "";
  const rawEmail = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  // Usernames are the only credential the UI asks for. A real email is still
  // accepted so an account created before this change can still sign in.
  const email = rawUsername
    ? rawUsername.includes("@")
      ? rawUsername.toLowerCase()
      : emailForUsername(rawUsername)
    : rawEmail.toLowerCase();

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Username and password are required." },
      { status: 400 }
    );
  }

  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      const message = error?.message ?? "";
      if (/email not confirmed/i.test(message)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "This email is not confirmed yet. Open the Supabase confirmation email, or turn “Confirm email” off in Authentication → Sign In / Providers → Email.",
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { ok: false, error: "Wrong username or password." },
        { status: 401 }
      );
    }

    // When a tile was selected, prevent accidentally entering the other account.
    if (body?.selectedUserId && data.user.id !== body.selectedUserId) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { ok: false, error: "That username belongs to the other Momentum account." },
        { status: 401 }
      );
    }

    const profile = await supabase
      .from("profiles")
      .select("id,name,color")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile.error && isMissingSchemaError(profile.error)) {
      return NextResponse.json(
        { ok: false, error: SCHEMA_MISSING_MESSAGE },
        { status: 503 }
      );
    }

    const metadata = (data.user.user_metadata ?? {}) as {
      name?: string;
      color?: string;
    };
    const row = profile.data as { id: string; name: string; color: string } | null;
    const name =
      row?.name ?? metadata.name ?? (data.user.email ?? "Owner").split("@")[0];
    const color = row?.color ?? metadata.color ?? "#a3e635";

    return NextResponse.json({
      ok: true,
      user: { id: data.user.id, key: data.user.id, name, color },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Supabase is unavailable. Try again in a moment.",
      },
      { status: 503 }
    );
  }
}
