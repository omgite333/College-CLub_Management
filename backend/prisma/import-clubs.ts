import "dotenv/config";
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Ev = { title: string; schedule: string | null; date: string | null; location: string | null };
type ClubIn = { name: string; description: string; events: Ev[] };

async function main() {
  const clubs: ClubIn[] = JSON.parse(readFileSync("/tmp/clubs_import.json", "utf8"));

  // --- wipe all previous data ---
  const wiped = {
    bookings: (await prisma.booking.deleteMany()).count,
    memberships: (await prisma.membership.deleteMany()).count,
    users: (await prisma.user.deleteMany()).count,
    events: (await prisma.event.deleteMany()).count,
    clubs: (await prisma.club.deleteMany()).count,
    classrooms: (await prisma.classroom.deleteMany()).count,
  };
  console.log("WIPED:", JSON.stringify(wiped));

  let clubCount = 0, eventCount = 0;
  for (const c of clubs) {
    const club = await prisma.club.create({
      data: { name: c.name, description: c.description || null },
    });
    clubCount++;
    for (const e of c.events) {
      await prisma.event.create({
        data: {
          clubId: club.id,
          title: e.title,
          schedule: e.schedule,
          date: e.date ? new Date(e.date) : null,
          location: e.location,
        },
      });
      eventCount++;
    }
  }

  const counts = {
    clubs: await prisma.club.count(),
    events: await prisma.event.count(),
    users: await prisma.user.count(),
    memberships: await prisma.membership.count(),
    bookings: await prisma.booking.count(),
    classrooms: await prisma.classroom.count(),
  };
  console.log("IMPORTED:", JSON.stringify({ clubs: clubCount, events: eventCount }));
  console.log("FINAL COUNTS:", JSON.stringify(counts));
}

main()
  .catch((e) => { console.error("IMPORT FAILED:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
