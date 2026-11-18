/** Used by the Vercel build: seeds demo data only when the database has no farms yet (never wipes real data). */
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";

const prisma = new PrismaClient();
(async () => {
  const farms = await prisma.farm.count();
  await prisma.$disconnect();
  if (farms > 0) {
    console.log(`Database already has ${farms} farms — skipping seed.`);
    return;
  }
  console.log("Empty database — seeding demo data…");
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
