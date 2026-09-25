import { mkdirSync, openSync, closeSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

// Local-only SQLite mode. Vercel continues to generate its PostgreSQL client.
mkdirSync("prisma", { recursive: true });
const database = resolve("prisma/dev.db");
closeSync(openSync(database, "a"));
const env = {
  ...process.env,
  LOCAL_STORAGE_ENABLED: "1",
  DATABASE_URL: `file:${database.replaceAll("\\", "/")}`,
};
function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run("node_modules/prisma/build/index.js", [
  "generate",
  "--schema",
  "legacy/sqlite/schema.prisma",
]);
run("node_modules/prisma/build/index.js", [
  "migrate",
  "deploy",
  "--schema",
  "legacy/sqlite/schema.prisma",
]);
run("node_modules/next/dist/bin/next", ["dev", "--hostname", "127.0.0.1"]);
