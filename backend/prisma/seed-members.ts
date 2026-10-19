import "dotenv/config";
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type MemberIn = { club: string; name: string; role: string | null };

async function main() {
  const members: MemberIn[] = JSON.parse(readFileSync("/tmp/members_seed.json", "utf8"));

  const wiped = (await prisma.clubMember.deleteMany()).count;
  console.log("WIPED club members:", wiped);

  const clubs = await prisma.club.findMany({ select: { id: true, name: true } });
  const byName = new Map(clubs.map((c) => [c.name, c.id]));

  let created = 0, skipped = 0;
  for (const m of members) {
    const clubId = byName.get(m.club);
    if (!clubId) {
      console.log("SKIP (no club):", m.club, "-", m.name);
      skipped++;
      continue;
    }
    await prisma.clubMember.create({
      data: { clubId, name: m.name, role: m.role },
    });
    created++;
  }
  console.log(`SEEDED: ${created} members, skipped: ${skipped}`);
  console.log("FINAL COUNT:", await prisma.clubMember.count());
}

main()
  .catch((e) => { console.error("SEED FAILED:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
