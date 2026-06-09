"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { db } from "@/db";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

// --- Schemas ---------------------------------------------------------------

const credentialsSchema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail-Adresse eingeben."),
  password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen haben."),
});

const signUpSchema = credentialsSchema.extend({
  fullName: z.string().min(2, "Bitte deinen Namen eingeben."),
});

const mfaCodeSchema = z.object({
  factorId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, "Der Code besteht aus 6 Ziffern."),
});

// --- Sign in / out ---------------------------------------------------------

export type SignInOutcome =
  | { status: "authenticated" }
  | { status: "mfa_required"; factorId: string };

/**
 * Password sign-in. If the account has a verified TOTP factor, returns
 * `mfa_required` with the factor id so the client can prompt for the code.
 */
export async function signIn(
  input: z.input<typeof credentialsSchema>,
): Promise<ActionResult<SignInOutcome>> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return err("E-Mail oder Passwort ist falsch.");

  // Determine whether a second factor is still required.
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.find((f) => f.status === "verified");
    if (totp) {
      return ok({ status: "mfa_required", factorId: totp.id });
    }
  }

  return ok({ status: "authenticated" });
}

/** Completes login by verifying a TOTP challenge (MFA enforcement). */
export async function verifyMfa(
  input: z.input<typeof mfaCodeSchema>,
): Promise<ActionResult<{ status: "authenticated" }>> {
  const parsed = mfaCodeSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: parsed.data.factorId });
  if (challengeError || !challenge) {
    return err("Die MFA-Anfrage konnte nicht gestartet werden.");
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: parsed.data.factorId,
    challengeId: challenge.id,
    code: parsed.data.code,
  });
  if (verifyError) return err("Der eingegebene Code ist ungültig.");

  return ok({ status: "authenticated" });
}

export async function signOut(): Promise<never> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// --- Sign up ---------------------------------------------------------------

/**
 * Registers a new account. Creates the Supabase Auth user and a matching
 * `user_profiles` row (via the service role, so it works before email
 * confirmation). Tenant creation happens later in the onboarding flow.
 */
export async function signUp(
  input: z.input<typeof signUpSchema>,
): Promise<ActionResult<{ needsEmailConfirmation: boolean }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
    },
  });
  if (error) return err(error.message);
  if (!data.user) return err("Die Registrierung ist fehlgeschlagen.");

  // Mirror into user_profiles (id === auth.uid()).
  const service = createSupabaseServiceClient();
  await service.from("user_profiles").upsert(
    {
      id: data.user.id,
      email: parsed.data.email,
      full_name: parsed.data.fullName,
    },
    { onConflict: "id" },
  );

  return ok({ needsEmailConfirmation: !data.session });
}

// --- MFA enrollment (from settings) ----------------------------------------

/**
 * Begins TOTP enrollment. Returns the provisioning QR (SVG) and secret to show
 * in an authenticator app, plus the factor id used to confirm.
 */
export async function enrollMfa(): Promise<
  ActionResult<{ factorId: string; qrCode: string; secret: string }>
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Nicht angemeldet.");

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `totp-${Date.now()}`,
  });
  if (error || !data) return err("MFA konnte nicht eingerichtet werden.");

  return ok({
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  });
}

/** Confirms TOTP enrollment with the first code and flags the profile. */
export async function confirmMfaEnrollment(
  input: z.input<typeof mfaCodeSchema>,
): Promise<ActionResult<{ enabled: true }>> {
  const parsed = mfaCodeSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Nicht angemeldet.");

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: parsed.data.factorId });
  if (challengeError || !challenge) {
    return err("Die MFA-Anfrage konnte nicht gestartet werden.");
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: parsed.data.factorId,
    challengeId: challenge.id,
    code: parsed.data.code,
  });
  if (verifyError) return err("Der eingegebene Code ist ungültig.");

  await db
    .update(userProfiles)
    .set({ mfaEnabled: true, mfaEnrolledAt: new Date() })
    .where(eq(userProfiles.id, user.id));

  return ok({ enabled: true });
}

/** Removes a TOTP factor and clears the profile MFA flag. */
export async function unenrollMfa(
  factorId: string,
): Promise<ActionResult<{ disabled: true }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Nicht angemeldet.");

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return err("MFA konnte nicht entfernt werden.");

  await db
    .update(userProfiles)
    .set({ mfaEnabled: false, mfaEnrolledAt: null })
    .where(eq(userProfiles.id, user.id));

  return ok({ disabled: true });
}
