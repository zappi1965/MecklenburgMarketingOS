import { ScanClient } from "@/components/loyalty/scan-client";

export const dynamic = "force-dynamic";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <ScanClient token={token} />
    </main>
  );
}
