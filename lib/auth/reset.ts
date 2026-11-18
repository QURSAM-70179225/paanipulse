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
