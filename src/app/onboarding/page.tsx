import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { OnboardingForm } from "@/components/shared/onboarding-form";

export default async function OnboardingPage() {
  const ctx = await requireSession();
  // Already onboarded → go to the dashboard.
  if (ctx.tenant) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <OnboardingForm />
    </main>
  );
}
