// Keeps src/lib/supabase/schema-sql.ts byte-identical to supabase/schema.sql
// so the in-app setup screen can show (and copy) the exact migration.
import { readFileSync, writeFileSync } from "node:fs";

const sql = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
const escaped = sql.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
writeFileSync(
  new URL("../src/lib/supabase/schema-sql.ts", import.meta.url),
  `// AUTO-GENERATED from supabase/schema.sql by scripts/generate-schema-module.mjs.\n// Do not edit by hand — edit the .sql file and re-run the script.\n\nexport const MOMENTUM_SCHEMA_SQL = \`${escaped}\`;\n`
);
console.log("schema-sql.ts regenerated (" + sql.length + " chars)");
