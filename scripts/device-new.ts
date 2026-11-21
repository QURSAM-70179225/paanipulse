/**
 * Makes new SIM devices (run when building boxes, not by farmers). For each it prints:
 *  - the CLAIM CODE to print on a sticker on the box (the farmer types it once in the app), and
 *  - the SECRET to put into that box's firmware (DEVICE_SECRET). It is shown only here, once; the server keeps only its hash.
 *
 *   npm run device:new -- --kind probe            # one soil probe
 *   npm run device:new -- --kind pump --count 5   # five pump control boxes
 *
 * Uses DATABASE_URL, so run it against the database the devices will report to (production for real boxes).
 */
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { makeCode, type DeviceKind } from "../lib/devices/code";

const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : def;
};

async function main() {
  const kind = arg("kind", "probe") as DeviceKind;
  if (kind !== "probe" && kind !== "pump") throw new Error('--kind must be "probe" or "pump"');
  const count = Math.max(1, Math.min(100, Number(arg("count", "1")) || 1));
  const prisma = new PrismaClient();
  try {
    console.log(`kind,code,secret`);
    for (let i = 0; i < count; i++) {
      const secret = randomBytes(24).toString("base64url");
      let code = makeCode((n) => randomBytes(n));
      while (await prisma.device.findUnique({ where: { code }, select: { id: true } })) code = makeCode((n) => randomBytes(n));
      await prisma.device.create({ data: { kind, code, secretHash: createHash("sha256").update(secret, "utf8").digest("hex") } });
      console.log(`${kind},${code},${secret}`);
    }
    console.error(`\nMade ${count} ${kind} device(s). Keep the secrets safe: they cannot be shown again. Print each code on its box.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
