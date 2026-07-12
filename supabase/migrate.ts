/**
 * supabase/migrate.ts
 *
 * Runs SQL migrations against the Supabase project using the service role key.
 *
 * Strategy:
 *   1. Try to use a Postgres `exec_sql` RPC function (if it exists in the DB).
 *   2. Fall back to executing statements one at a time via the JS SDK
 *      (only works for a limited subset of SQL).
 *
 * Usage:
 *   npm run db:migrate
 */
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function getMigrationFiles(): Promise<string[]> {
  const files = await readdir(join(__dirname, "migrations"));
  return files.filter((f) => f.endsWith(".sql")).sort();
}

/**
 * Splits a SQL file into individual statements.
 * This is a simple splitter — it doesn't understand PL/pgSQL $$ blocks perfectly,
 * but works for our migration files (no functions defined).
 */
function splitSqlStatements(sql: string): string[] {
  return sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
}

async function runViaRpc(
  supabase: ReturnType<typeof createClient>,
  sql: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("exec_sql" as never, { query: sql });
  if (!error) return { ok: true };
  return { ok: false, error: error.message };
}

async function runMigrations() {
  // Load .env from project root so `npm run db:migrate` works without dotenv.
  try {
    const envText = await readFile(join(__dirname, "..", ".env"), "utf8");
    for (const line of envText.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // .env missing — rely on already-set env vars.
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const files = await getMigrationFiles();

  console.log(`\n📦 Found ${files.length} migration(s):\n  - ${files.join("\n  - ")}\n`);

  // Quick test: try RPC first
  const rpcTest = await runViaRpc(supabase, "SELECT 1;");
  const useRpc = rpcTest.ok;

  if (!useRpc) {
    console.log(
      "⚠️  RPC `exec_sql` not available — falling back to per-statement execution."
    );
    console.log(
      "   For full migration support, create an exec_sql function in your DB:\n"
    );
    console.log(
      `   CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS void\n   LANGUAGE plpgsql SECURITY DEFINER AS $$\n   BEGIN\n     EXECUTE query;\n   END;\n   $$;\n`
    );
  }

  for (const file of files) {
    const sql = await readFile(join(__dirname, "migrations", file), "utf-8");
    console.log(`\n▶ Running ${file}...`);

    if (useRpc) {
      const result = await runViaRpc(supabase, sql);
      if (!result.ok) {
        console.error(`✗ ${file} failed:`, result.error);
        process.exit(1);
      }
    } else {
      const statements = splitSqlStatements(sql);
      for (const stmt of statements) {
        const result = await runViaRpc(supabase, stmt);
        if (!result.ok) {
          console.error(`✗ Failed statement in ${file}:`);
          console.error(stmt.substring(0, 200) + "...");
          console.error("Error:", result.error);
          console.error(
            "\nThe fallback RPC mode can't execute DDL like CREATE TABLE.\n" +
              "Create the exec_sql function above (one-time setup) and re-run."
          );
          process.exit(1);
        }
      }
    }

    console.log(`✓ ${file} applied`);
  }

  console.log("\n✅ All migrations applied successfully.\n");
}

runMigrations().catch((e) => {
  console.error(e);
  process.exit(1);
});