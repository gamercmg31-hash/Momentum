import { getSupabaseAnon } from "@/lib/supabase/server";
import {
  getSupabaseConfigurationStatus,
  isMissingSchemaError,
} from "@/lib/supabase/config";
import {
  probeSupabaseEndpoint,
  readSupabaseAuthConfiguration,
} from "@/lib/supabase/transport";

export const dynamic = "force-dynamic";

/** Liveness + exact Supabase configuration/readiness diagnostics. */
export async function GET() {
  const configuration = getSupabaseConfigurationStatus();

  if (!configuration.valid) {
    return Response.json({
      ok: true,
      ready: false,
      storage: "supabase",
      configured: configuration.configured,
      configurationValid: false,
      project: configuration.projectRef,
      keySource: configuration.keySource,
      error: configuration.error,
    });
  }

  const probe = await probeSupabaseEndpoint();
  if (!probe.ok) {
    return Response.json(
      {
        ok: false,
        ready: false,
        storage: "supabase",
        configured: true,
        configurationValid: true,
        project: configuration.projectRef,
        keySource: configuration.keySource,
        endpointStatus: probe.httpStatus,
        endpointContentType: probe.contentType,
        error: probe.error,
      },
      { status: 503 }
    );
  }

  const auth = await readSupabaseAuthConfiguration();
  if (!auth.ok) {
    return Response.json(
      {
        ok: false,
        ready: false,
        storage: "supabase",
        configured: true,
        configurationValid: true,
        project: configuration.projectRef,
        keySource: configuration.keySource,
        error: auth.error,
      },
      { status: 503 }
    );
  }

  try {
    const { error } = await getSupabaseAnon()
      .from("public_profiles")
      .select("id")
      .limit(1);

    if (error && isMissingSchemaError(error)) {
      return Response.json({
        ok: true,
        ready: false,
        storage: "supabase",
        configured: true,
        configurationValid: true,
        project: configuration.projectRef,
        keySource: configuration.keySource,
        signupsEnabled: auth.signupsEnabled,
        emailConfirmationDisabled: auth.emailConfirmationDisabled,
        schema: "missing",
        setupUrl: "/api/setup",
      });
    }

    if (error) {
      return Response.json(
        {
          ok: false,
          ready: false,
          storage: "supabase",
          configured: true,
          configurationValid: true,
          project: configuration.projectRef,
          keySource: configuration.keySource,
          error:
            error.message ||
            "Supabase responded, but the public_profiles view could not be queried.",
        },
        { status: 503 }
      );
    }

    const authReady =
      auth.signupsEnabled === true && auth.emailConfirmationDisabled === true;

    return Response.json({
      ok: true,
      ready: authReady,
      storage: "supabase",
      configured: true,
      configurationValid: true,
      project: configuration.projectRef,
      keySource: configuration.keySource,
      schema: "ready",
      signupsEnabled: auth.signupsEnabled,
      emailConfirmationDisabled: auth.emailConfirmationDisabled,
      error:
        auth.signupsEnabled === false
          ? "Email/password signups are disabled in Supabase Auth."
          : auth.emailConfirmationDisabled === false
            ? "Supabase Confirm email must be turned off for username accounts."
            : null,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        ready: false,
        storage: "supabase",
        configured: true,
        configurationValid: true,
        project: configuration.projectRef,
        keySource: configuration.keySource,
        error:
          error instanceof Error
            ? error.message
            : "Supabase responded, but the schema check failed.",
      },
      { status: 503 }
    );
  }
}
