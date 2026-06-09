import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * Applies every migration in supabase/migrations (in deployment order) to an
 * in-process Postgres (PGlite), then runs a smoke insert through the full
 * loyalty path. This verifies that the schema, RLS helper functions, policies
 * and audit triggers all create successfully and in the right order — without
 * any external database or credentials.
 *
 *   npm run db:verify
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

// Supabase provides the `auth` schema at runtime; stub it for local verification.
const AUTH_SHIM = `
  create schema if not exists auth;
  create table if not exists auth.users (id uuid primary key);
  create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
`;

export interface VerifyResult {
  migrationsApplied: number;
  auditRows: number;
  memberBalance: number;
}

export async function verifyMigrations(): Promise<VerifyResult> {
  const pg = new PGlite();
  await pg.exec(AUTH_SHIM);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    try {
      await pg.exec(sql);
    } catch (e) {
      throw new Error(
        `Migration failed: ${file}\n${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // Smoke test: drive a row through the full loyalty path so the audit trigger,
  // foreign keys and defaults are all exercised.
  const tenant = await pg.query<{ id: string }>(
    `insert into public.tenants (slug, name) values ('verify-store', 'Verify') returning id`,
  );
  const tenantId = tenant.rows[0].id;

  const program = await pg.query<{ id: string }>(
    `insert into public.loyalty_programs (tenant_id, name) values ($1, 'Stempelkarte') returning id`,
    [tenantId],
  );
  const programId = program.rows[0].id;

  const qr = await pg.query<{ id: string }>(
    `insert into public.qr_codes (tenant_id, program_id, token) values ($1, $2, 'verify-token') returning id`,
    [tenantId, programId],
  );
  const qrId = qr.rows[0].id;

  const member = await pg.query<{ id: string }>(
    `insert into public.loyalty_members (tenant_id, program_id, points_balance) values ($1, $2, 0) returning id`,
    [tenantId, programId],
  );
  const memberId = member.rows[0].id;

  await pg.query(
    `insert into public.qr_scans (tenant_id, qr_code_id, member_id, points_awarded) values ($1, $2, $3, 5)`,
    [tenantId, qrId, memberId],
  );
  await pg.query(
    `insert into public.loyalty_transactions (tenant_id, member_id, type, points) values ($1, $2, 'scan', 5)`,
    [tenantId, memberId],
  );
  await pg.query(
    `update public.loyalty_members set points_balance = points_balance + 5 where id = $1`,
    [memberId],
  );

  const balance = await pg.query<{ points_balance: number }>(
    `select points_balance from public.loyalty_members where id = $1`,
    [memberId],
  );
  const audit = await pg.query<{ count: string }>(
    `select count(*)::int as count from public.audit_log where tenant_id = $1`,
    [tenantId],
  );

  await pg.close();

  return {
    migrationsApplied: files.length,
    auditRows: Number(audit.rows[0].count),
    memberBalance: Number(balance.rows[0].points_balance),
  };
}

// Allow running directly via `npm run db:verify`.
if (process.argv[1] && process.argv[1].includes("verify-migrations")) {
  verifyMigrations()
    .then((r) => {
      console.log(
        `✓ ${r.migrationsApplied} migrations applied · ${r.auditRows} audit row(s) · member balance ${r.memberBalance}`,
      );
      process.exit(0);
    })
    .catch((err) => {
      console.error("✗ Migration verification failed:\n", err.message ?? err);
      process.exit(1);
    });
}
