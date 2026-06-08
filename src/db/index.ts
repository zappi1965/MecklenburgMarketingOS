import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Drizzle DB client (singleton).
 *
 * This client connects with full privileges via DATABASE_URL and bypasses RLS.
 * It is intended for migrations, seeding, server-side system tasks and webhook
 * handlers. Tenant-scoped user requests should go through the Supabase clients
 * (src/lib/supabase) so that RLS is enforced with the caller's JWT.
 */

declare global {
  // eslint-disable-next-line no-var
  var __mmosDbClient: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }
  // prepare:false keeps us compatible with Supabase's transaction pooler.
  return postgres(databaseUrl, { prepare: false });
}

const queryClient = globalThis.__mmosDbClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__mmosDbClient = queryClient;
}

export const db = drizzle(queryClient, { schema });

export { schema };
