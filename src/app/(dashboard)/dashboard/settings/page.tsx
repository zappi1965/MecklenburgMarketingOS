import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/rbac";
import { MfaSetup } from "@/components/auth/mfa-setup";
import { Button } from "@/components/ui/button";
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

      {ctx.tenant && can(ctx, "members:read") && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">Team</CardTitle>
            <CardDescription>
              Mitglieder und Rollen deines Stores verwalten.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/settings/team">
              <Button variant="outline" size="sm">
                Team verwalten
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {ctx.tenant && can(ctx, "dsar:export") && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">Datenschutz</CardTitle>
            <CardDescription>
              DSAR-Export und Löschroutinen (DSGVO).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/settings/privacy">
              <Button variant="outline" size="sm">
                Datenschutz öffnen
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {ctx.tenant && can(ctx, "audit:read") && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">Audit-Log</CardTitle>
            <CardDescription>
              Unveränderlicher Änderungsverlauf, exportierbar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/settings/audit">
              <Button variant="outline" size="sm">
                Audit-Log öffnen
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
