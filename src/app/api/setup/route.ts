import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabase/server";
import {
  getSupabaseConfigurationStatus,
  isMissingSchemaError,
} from "@/lib/supabase/config";
import {
  probeSupabaseEndpoint,
  readSupabaseAuthConfiguration,
} from "@/lib/supabase/transport";
import { MOMENTUM_SCHEMA_SQL } from "@/lib/supabase/schema-sql";

export const dynamic = "force-dynamic";

export interface SetupStatus {
  configured: boolean;
  configurationValid: boolean;
  reachable: boolean;
  schemaReady: boolean;
  projectRef: string | null;
  sqlEditorUrl: string | null;
  authProvidersUrl: string | null;
  accounts: number;
  maxAccounts: number;
  signupsEnabled: boolean | null;
  emailConfirmationDisabled: boolean | null;
  sql: string;
  error: string | null;
}

/** Tells the UI whether Supabase is valid, reachable, and schema-ready. */
export async function GET() {
  const configuration = getSupabaseConfigurationStatus();
  const projectRef = configuration.projectRef;

  const base: SetupStatus = {
    configured: configuration.configured,
    configurationValid: configuration.valid,
    reachable: false,
    schemaReady: false,
    projectRef,
    sqlEditorUrl: projectRef
      ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
      : null,
    authProvidersUrl: projectRef
      ? `https://supabase.com/dashboard/project/${projectRef}/auth/providers`
      : null,
    accounts: 0,
    maxAccounts: 2,
    signupsEnabled: null,
    emailConfirmationDisabled: null,
    sql: MOMENTUM_SCHEMA_SQL,
    error: configuration.error,
  };

  if (!configuration.valid) return NextResponse.json(base);

  const probe = await probeSupabaseEndpoint();
  if (!probe.ok) {
    return NextResponse.json({ ...base, error: probe.error });
  }

  const auth = await readSupabaseAuthConfiguration();
  const connectedBase: SetupStatus = {
    ...base,
    reachable: true,
    signupsEnabled: auth.signupsEnabled,
    emailConfirmationDisabled: auth.emailConfirmationDisabled,
  };
  if (!auth.ok) {
    return NextResponse.json({ ...connectedBase, error: auth.error });
  }

  try {
    const { data, error } = await getSupabaseAnon()
      .from("public_profiles")
      .select("id");

    if (error) {
      if (isMissingSchemaError(error)) {
        return NextResponse.json({
          ...connectedBase,
          error:
            "Momentum's tables do not exist in this Supabase project yet. Run the SQL below once.",
        });
      }
      return NextResponse.json({
        ...connectedBase,
        error:
          error.message ||
          "Supabase responded, but the public_profiles view could not be queried.",
      });
    }

    return NextResponse.json({
      ...connectedBase,
      schemaReady: true,
      accounts: data?.length ?? 0,
      error:
        auth.signupsEnabled === false
          ? "Email/password signups are disabled in Supabase Auth. Enable the Email provider before creating the two accounts."
          : auth.emailConfirmationDisabled === false
            ? "Supabase email confirmation is enabled. Turn off Confirm email before creating username accounts."
            : null,
    });
  } catch (error) {
    return NextResponse.json({
      ...connectedBase,
      error:
        error instanceof Error
          ? error.message
          : "Supabase responded, but the schema check failed.",
    });
  }
}
