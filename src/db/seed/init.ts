import { eq } from "drizzle-orm";
import { db } from "../index";
import {
  loyaltyPrograms,
  loyaltyRewards,
  qrCodes,
  tenants,
  tenantTools,
} from "../schema";
import { generateToken } from "../../lib/nanoid";

/**
 * Seed: a demo tenant with the loyalty tool active and a bootstrap program.
 *
 * Idempotent — re-running updates the demo tenant in place rather than
 * creating duplicates. Run once after the first migration:
 *   npx tsx src/db/seed/init.ts
 */

const DEMO_SLUG = "demo-store";

async function main() {
  console.log("Seeding demo tenant…");

  // 1. Demo tenant.
  const existing = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, DEMO_SLUG))
    .limit(1);

  let tenantId: string;
  if (existing.length > 0) {
    tenantId = existing[0].id;
    console.log(`  tenant exists: ${tenantId}`);
  } else {
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug: DEMO_SLUG,
        name: "Demo Store Mecklenburg",
        contactEmail: "demo@mmos.local",
        primaryColor: "#1d4ed8",
      })
      .returning();
    tenantId = tenant.id;
    console.log(`  created tenant: ${tenantId}`);
  }

  // 2. Activate the loyalty tool (trial).
  await db
    .insert(tenantTools)
    .values({
      tenantId,
      toolKey: "loyalty",
      status: "trial",
      trialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    })
    .onConflictDoNothing({
      target: [tenantTools.tenantId, tenantTools.toolKey],
    });

  // 3. Bootstrap loyalty program.
  const existingProgram = await db
    .select()
    .from(loyaltyPrograms)
    .where(eq(loyaltyPrograms.tenantId, tenantId))
    .limit(1);

  let programId: string;
  if (existingProgram.length > 0) {
    programId = existingProgram[0].id;
    console.log(`  program exists: ${programId}`);
  } else {
    const [program] = await db
      .insert(loyaltyPrograms)
      .values({
        tenantId,
        name: "Stempelkarte",
        description: "Bei jedem Besuch einen Stempel sammeln.",
        pointsPerScan: 1,
        stampsPerCard: 10,
      })
      .returning();
    programId = program.id;
    console.log(`  created program: ${programId}`);

    // A first QR code for the program.
    await db.insert(qrCodes).values({
      tenantId,
      programId,
      token: generateToken(),
      label: "Theke",
      targetType: "stamp",
    });

    // A starter reward.
    await db.insert(loyaltyRewards).values({
      tenantId,
      programId,
      name: "Gratis Kaffee",
      description: "Eine Tasse Kaffee gratis.",
      pointsCost: 10,
    });
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
