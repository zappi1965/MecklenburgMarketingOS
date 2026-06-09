import { describe, it, expect } from "vitest";
import { verifyMigrations } from "../../scripts/verify-migrations";

// Applies every migration to an in-process Postgres (PGlite) and runs a smoke
// insert. Catches migration-ordering regressions (e.g. a tool's RLS landing
// before its table migration) without any external database.
describe("database migrations", () => {
  it(
    "apply in order and exercise the loyalty path + audit trigger",
    async () => {
      const result = await verifyMigrations();
      expect(result.migrationsApplied).toBeGreaterThan(0);
      // member insert + balance update both fire the audit trigger.
      expect(result.auditRows).toBeGreaterThanOrEqual(2);
      expect(result.memberBalance).toBe(5);
    },
    60_000,
  );
});
