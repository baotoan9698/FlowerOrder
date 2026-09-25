import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";
nextEnv.loadEnvConfig(process.cwd());
for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
  const value = process.env[name] || "";
  if (!/^postgres(ql)?:\/\//.test(value) || value.includes("YOUR-HOST")) {
    console.error(
      `${name} must be configured with a real PostgreSQL connection string. See README.md. SQLite cannot be used on Vercel.`,
    );
    process.exit(1);
  }
}
function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run("node_modules/prisma/build/index.js", ["generate"]);
run("node_modules/prisma/build/index.js", ["migrate", "deploy"]);
if (!process.argv.includes("--migrate-only"))
  run("node_modules/next/dist/bin/next", ["build"]);
