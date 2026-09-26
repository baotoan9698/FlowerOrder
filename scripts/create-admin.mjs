import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Usage: node scripts/create-admin.mjs admin@example.com");
const db = new PrismaClient();
try {
  if (await db.admin.findUnique({ where: { email } })) throw new Error("Admin already exists; password was not changed.");
  const password = randomBytes(18).toString("base64url");
  const salt = randomBytes(16).toString("hex");
  await db.admin.create({ data: { email, name: "Admin", passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}` } });
  console.log(`Admin: ${email}\nPassword: ${password}`);
} finally { await db.$disconnect(); }
