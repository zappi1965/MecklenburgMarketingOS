import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

/**
 * Applies every migration in supabase/migrations (deployment order) to the
 * database in DATABASE_URL, idempotently — already-applied files are tracked in
 * `_mmos_migrations` and skipped, so this is safe to re-run.
 *
 * Use against Supabase (the `auth` schema already exists there):
 *   npm run db:migrate
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const sql = postgres(url, { prepare: false, max: 1 });

  await sql`
    create table if not exists public._mmos_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const applied = await sql<{ name: string }[]>`select name from public._mmos_migrations`;
  const appliedSet = new Set(applied.map((r) => r.name));

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  skip (applied): ${file}`);
      continue;
    }
    const content = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    try {
      await sql.unsafe(content).simple();
      await sql`insert into public._mmos_migrations (name) values (${file})`;
      console.log(`  applied: ${file}`);
      count++;
    } catch (e) {
      console.error(
        `  FAILED: ${file}\n${e instanceof Error ? e.message : String(e)}`,
      );
      await sql.end();
      process.exit(1);
    }
  }

  console.log(`\nDone. ${count} new migration(s) applied.`);
  await sql.end();
}

main().catch((err) => {
  console.error("apply-migrations failed:", err);
  process.exit(1);
});
