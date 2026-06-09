import { requireSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MfaSetup } from "@/components/auth/mfa-setup";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SettingsPage() {
  const ctx = await requireSession();

  // Determine MFA state from the verified TOTP factor on the session.
  const supabase = await createSupabaseServerClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verifiedTotp = factors?.totp?.find((f) => f.status === "verified");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
        <p className="text-sm text-muted-foreground">{ctx.email}</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">
            Zwei-Faktor-Authentifizierung
          </CardTitle>
          <CardDescription>
            Erhöhe die Sicherheit deines Kontos mit einem zeitbasierten
            Einmalcode (TOTP).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MfaSetup
            enabled={Boolean(verifiedTotp)}
            factorId={verifiedTotp?.id ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
