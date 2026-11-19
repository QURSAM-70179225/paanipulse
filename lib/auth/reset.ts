/** Password reset tokens: random 32 bytes, only the SHA-256 hash is stored, 30-minute single use. */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

const TTL_MS = 30 * 60_000;
const sha = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createResetToken(userId: string): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({ data: { userId, tokenHash: sha(raw), expiresAt: new Date(Date.now() + TTL_MS) } });
  return raw;
}

/** Returns the user id if the token is valid, and marks it (and the user's other tokens) used. */
export async function consumeResetToken(raw: string): Promise<string | null> {
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha(raw) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  await prisma.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: new Date() } });
  return row.userId;
}

// ── 6-digit codes for farmers (phone accounts), delivered by SMS / WhatsApp ───────────────────────────────

import { createHmac, randomInt } from "node:crypto";

const CODE_TTL_MS = 10 * 60_000;
const MAX_CODES_PER_HOUR = 3;
const MAX_ATTEMPTS = 5;

/** HMAC with AUTH_SECRET so a leaked database alone can't be used to read codes. */
const codeHash = (userId: string, code: string) => createHmac("sha256", process.env.AUTH_SECRET ?? "").update(`${userId}:${code}`).digest("hex");

/** Returns a fresh code, or null if this phone asked for too many codes in the last hour. */
export async function createPhoneCode(userId: string): Promise<string | null> {
  const recent = await prisma.passwordResetToken.count({ where: { userId, createdAt: { gt: new Date(Date.now() - 3_600_000) } } });
  if (recent >= MAX_CODES_PER_HOUR) return null;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.passwordResetToken.create({ data: { userId, tokenHash: codeHash(userId, code), expiresAt: new Date(Date.now() + CODE_TTL_MS) } });
  return code;
}

/** True if the code matches an unused, unexpired, unlocked code. Wrong guesses are counted; 5 locks the codes. */
export async function consumePhoneCode(userId: string, code: string): Promise<boolean> {
  const active = await prisma.passwordResetToken.findMany({ where: { userId, usedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: MAX_ATTEMPTS } } });
  const hash = codeHash(userId, code);
  if (active.some((t) => t.tokenHash === hash)) {
    await prisma.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
    return true;
  }
  if (active.length) await prisma.passwordResetToken.updateMany({ where: { id: { in: active.map((t) => t.id) } }, data: { attempts: { increment: 1 } } });
  return false;
}
