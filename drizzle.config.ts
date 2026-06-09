import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Point it at the Supabase Postgres (EU/Frankfurt) connection string.",
  );
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  // RLS policies + audit triggers live in 0001_platform_rls.sql and are
  // maintained by hand — drizzle-kit only owns the table DDL.
  verbose: true,
  strict: true,
});
