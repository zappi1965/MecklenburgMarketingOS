import { headers } from "next/headers";
import { confirmConsent } from "@/lib/consent";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { title: string; body: string }> = {
  confirmed: {
    title: "Bestätigt ✓",
    body: "Vielen Dank! Deine Einwilligung wurde bestätigt.",
  },
  already_confirmed: {
    title: "Bereits bestätigt",
    body: "Diese Einwilligung wurde bereits bestätigt. Du musst nichts weiter tun.",
  },
  expired: {
    title: "Link abgelaufen",
    body: "Dieser Bestätigungslink ist abgelaufen. Bitte fordere einen neuen an.",
  },
  invalid: {
    title: "Ungültiger Link",
    body: "Dieser Bestätigungslink ist ungültig.",
  },
};

export default async function ConsentConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  const userAgent = h.get("user-agent");

  const result = await confirmConsent(token, { ip, userAgent });
  const message = MESSAGES[result.status];

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>{message.title}</CardTitle>
          <CardDescription>{message.body}</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </main>
  );
}
