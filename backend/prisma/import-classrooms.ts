import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Room = { name: string; building: string; type: string };

// Numbered classrooms with department allocation
const numbered: Array<[string, string]> = [
  ["Classroom 1", "Mechanical"], ["Classroom 2", "Mechanical"],
  ["Classroom 3", "FY"], ["Classroom 5", "FY"],
  ["Classroom 6", "FY"], ["Classroom 7", "FY"],
  ["Classroom 4", "AIML"],
  ["Classroom 8", "Electrical"], ["Classroom 9", "Electrical"],
  ["Classroom 10", "Electronics"], ["Classroom 11", "Electronics"],
  ["Classroom 12", "Civil"], ["Classroom 13", "Civil"],
  ["Classroom 14", "General"], ["Classroom 15", "General"], ["Classroom 16", "General"],
  ["Classroom 17", "CSE"], ["Classroom 18", "CSE"],
  ["Classroom 20", "IT"],
  ["N2 Classroom", "IT"],
];

const extra: Room[] = [
  { name: "Main CCF", building: "Central", type: "CCF" },
  { name: "Mini CCF", building: "Central", type: "CCF" },
  { name: "CSE Seminar Hall", building: "CSE", type: "SEMINAR_HALL" },
  { name: "Library Stairs Area", building: "Library", type: "OPEN_AREA" },
  { name: "Study Rooms", building: "Library", type: "STUDY_ROOM" },
  { name: "OAT", building: "Central", type: "OPEN_AREA" },
  { name: "Sathe Hall", building: "Central", type: "HALL" },
  { name: "Mechanical Production Seminar Hall", building: "Mechanical", type: "SEMINAR_HALL" },
  { name: "Design Seminar Hall", building: "Mechanical", type: "SEMINAR_HALL" },
  { name: "Electrical Seminar Hall", building: "Electrical", type: "SEMINAR_HALL" },
  { name: "Civil Seminar Hall", building: "Civil", type: "SEMINAR_HALL" },
  { name: "Electronics PG Classroom", building: "Electronics", type: "CLASSROOM" },
];

async function main() {
  const rooms: Room[] = [
    ...numbered.map(([name, building]) => ({ name, building, type: "CLASSROOM" })),
    ...extra,
  ];
  let created = 0, kept = 0;
  for (const r of rooms) {
    const existing = await prisma.classroom.findUnique({ where: { name: r.name } });
    if (existing) { kept++; continue; }
    // capacity/floor unknown -> 0; map coords default to center until laid out
    await prisma.classroom.create({
      data: { name: r.name, building: r.building, floor: 0, capacity: 0, type: r.type },
    });
    created++;
  }
  console.log(JSON.stringify({ created, alreadyPresent: kept, total: await prisma.classroom.count() }));
}

main()
  .catch((e) => { console.error("IMPORT FAILED:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
