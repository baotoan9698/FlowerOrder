import { existsSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log(
    "Created .env. Set DATABASE_URL and DIRECT_URL to PostgreSQL, then run npm run setup again.",
  );
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  ["scripts/vercel-build.mjs", "--migrate-only"],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
