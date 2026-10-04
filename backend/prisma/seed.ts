import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/auth";

const prisma = new PrismaClient();

async function main() {
  // --- Users (idempotent) ---
  const users: Array<{
    email: string;
    name: string;
    password: string;
    role: "STUDENT" | "CLUB_ADMIN" | "SUPER_ADMIN";
  }> = [
    { email: "superadmin@college.edu", name: "Aarav Sharma", password: "Super@123", role: "SUPER_ADMIN" },
    { email: "clubadmin@college.edu", name: "Diya Patel", password: "Club@123", role: "CLUB_ADMIN" },
    { email: "student@college.edu", name: "Om Gite", password: "Student@123", role: "STUDENT" },
  ];

  const userByEmail: Record<string, string> = {};
  for (const u of users) {
    const record = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash: await hashPassword(u.password) },
      create: { name: u.name, email: u.email, role: u.role, passwordHash: await hashPassword(u.password) },
    });
    userByEmail[u.email] = record.id;
  }

  // --- Clubs ---
  const clubDefs = [
    {
      name: "Robotics Club",
      description:
        "Design and build autonomous bots. Weekly hands-on workshops on microcontrollers, sensors, and line-following robots.",
    },
    {
      name: "Coding Club",
      description:
        "Competitive programming practice, hackathons, and open-source collaboration. All skill levels welcome.",
    },
    {
      name: "Drama Society",
      description:
        "Stage plays, street theatre, and script readings. From rehearsals to full productions every semester.",
    },
    {
      name: "Music Club",
      description:
        "Band jams, auditions, and acoustic nights. Classical, rock, and everything in between.",
    },
    {
      name: "Photography Club",
      description:
        "Photo walks, darkroom basics, and editing workshops. Learn to see the world through a lens.",
    },
  ];

  const clubByName: Record<string, string> = {};
  for (const c of clubDefs) {
    const club = await prisma.club.upsert({
      where: { name: c.name },
      update: { description: c.description },
      create: { name: c.name, description: c.description },
    });
    clubByName[c.name] = club.id;
  }

  // --- Memberships ---
  await prisma.membership.upsert({
    where: {
      userId_clubId: {
        userId: userByEmail["clubadmin@college.edu"],
        clubId: clubByName["Robotics Club"],
      },
    },
    update: { role: "CLUB_ADMIN" },
    create: {
      userId: userByEmail["clubadmin@college.edu"],
      clubId: clubByName["Robotics Club"],
      role: "CLUB_ADMIN",
    },
  });

  for (const clubName of ["Robotics Club", "Coding Club"]) {
    await prisma.membership.upsert({
      where: {
        userId_clubId: {
          userId: userByEmail["student@college.edu"],
          clubId: clubByName[clubName],
        },
      },
      update: { role: "STUDENT" },
      create: {
        userId: userByEmail["student@college.edu"],
        clubId: clubByName[clubName],
        role: "STUDENT",
      },
    });
  }

  // --- Remove rooms from the old generic demo layout (bookings cascade) ---
  await prisma.classroom.deleteMany({
    where: { name: { in: ["LH-101", "CR-201", "CR-102", "LAB-301", "SEM-201", "AUD-01", "WS-01"] } },
  });

  // --- Classrooms: the real building (courtyard layout) ---
  // Left wing: C-101..C-106, right wing: C-201..C-206,
  // top wing: C-301 / Sathe Hall / C-302, center: Tilak Hall,
  // bottom wing: C-303 / Open Theater / C-304
  const classroomDefs: Array<{
    name: string;
    building: string;
    floor: number;
    capacity: number;
    type: string;
    x: number;
    y: number;
  }> = [
    { name: "C-101", building: "Main Building", floor: 0, capacity: 60, type: "CLASSROOM", x: 17, y: 11.5 },
    { name: "C-102", building: "Main Building", floor: 0, capacity: 60, type: "CLASSROOM", x: 17, y: 21.5 },
    { name: "C-103", building: "Main Building", floor: 0, capacity: 60, type: "CLASSROOM", x: 17, y: 31.5 },
    { name: "C-104", building: "Main Building", floor: 0, capacity: 60, type: "CLASSROOM", x: 17, y: 48.5 },
    { name: "C-105", building: "Main Building", floor: 0, capacity: 60, type: "CLASSROOM", x: 17, y: 58.5 },
    { name: "C-106", building: "Main Building", floor: 0, capacity: 60, type: "CLASSROOM", x: 17, y: 68.5 },
    { name: "C-201", building: "Main Building", floor: 0, capacity: 60, type: "CLASSROOM", x: 83, y: 11.5 },
    { name: "C-202", building: "Main Building", floor: 0, capacity: 60, type: "CLASSROOM", x: 83, y: 21.5 },
    { name: "C-203", building: "Main Building", floor: 0, capacity: 60, type: "CLASSROOM", x: 83, y: 31.5 },
    { name: "C-204", building: "Main Building", floor: 0, capacity: 60, type: "CLASSROOM", x: 83, y: 48.5 },
    { name: "C-205", building: "Main Building", floor: 0, capacity: 60, type: "CLASSROOM", x: 83, y: 58.5 },
    { name: "C-206", building: "Main Building", floor: 0, capacity: 60, type: "CLASSROOM", x: 83, y: 68.5 },
    { name: "C-301", building: "Main Building", floor: 0, capacity: 60, type: "CLASSROOM", x: 36, y: 11.5 },
    { name: "Sathe Hall", building: "Main Building", floor: 0, capacity: 150, type: "HALL", x: 50, y: 11.5 },
    { name: "C-302", building: "Main Building", floor: 0, capacity: 60, type: "CLASSROOM", x: 64, y: 11.5 },
    { name: "Tilak Hall", building: "Main Building", floor: 0, capacity: 200, type: "HALL", x: 50, y: 30.5 },
    { name: "C-303", building: "Main Building", floor: 0, capacity: 60, type: "CLASSROOM", x: 36, y: 66.5 },
    { name: "Open Theater", building: "Main Building", floor: 0, capacity: 300, type: "THEATER", x: 50, y: 66.5 },
    { name: "C-304", building: "Main Building", floor: 0, capacity: 60, type: "CLASSROOM", x: 64, y: 66.5 },
  ];

  const roomByName: Record<string, string> = {};
  for (const r of classroomDefs) {
    const room = await prisma.classroom.upsert({
      where: { name: r.name },
      update: { building: r.building, floor: r.floor, capacity: r.capacity, type: r.type, x: r.x, y: r.y },
      create: r,
    });
    roomByName[r.name] = room.id;
  }

  // --- Bookings (idempotent via title + club + classroom dedup) ---
  const now = Date.now();
  const at = (dayOffset: number, h: number, m = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const bookingDefs: Array<{
    club: string;
    room: string;
    bookedBy: string;
    title: string;
    purpose: string;
    startTime: Date;
    endTime: Date;
  }> = [
    {
      club: "Robotics Club",
      room: "Tilak Hall",
      bookedBy: "clubadmin@college.edu",
      title: "Line-Follower Bot Build",
      purpose: "Weekly robotics workshop",
      startTime: new Date(now - 30 * 60 * 1000),
      endTime: new Date(now + 90 * 60 * 1000),
    },
    {
      club: "Coding Club",
      room: "C-101",
      bookedBy: "student@college.edu",
      title: "CP Practice Session",
      purpose: "Competitive programming drills",
      startTime: at(1, 16),
      endTime: at(1, 18),
    },
    {
      club: "Music Club",
      room: "Sathe Hall",
      bookedBy: "clubadmin@college.edu",
      title: "Band Auditions",
      purpose: "Auditions for the annual fest band",
      startTime: at(1, 10),
      endTime: at(1, 13),
    },
    {
      club: "Photography Club",
      room: "Open Theater",
      bookedBy: "student@college.edu",
      title: "Golden Hour Photo Walk",
      purpose: "Evening shoot around campus",
      startTime: at(2, 17),
      endTime: at(2, 19),
    },
    {
      club: "Drama Society",
      room: "Tilak Hall",
      bookedBy: "clubadmin@college.edu",
      title: "Play Rehearsal — Act II",
      purpose: "Full cast rehearsal",
      startTime: at(3, 18),
      endTime: at(3, 21),
    },
    {
      club: "Robotics Club",
      room: "C-203",
      bookedBy: "clubadmin@college.edu",
      title: "Drone Assembly Workshop",
      purpose: "Build night: quadcopter frames",
      startTime: at(5, 11),
      endTime: at(5, 14),
    },
    {
      club: "Coding Club",
      room: "C-104",
      bookedBy: "student@college.edu",
      title: "Hackathon Team Formation",
      purpose: "Find your team for HackNight",
      startTime: at(6, 15),
      endTime: at(6, 17),
    },
    {
      club: "Music Club",
      room: "Open Theater",
      bookedBy: "clubadmin@college.edu",
      title: "Acoustic Night",
      purpose: "Unplugged performances",
      startTime: at(8, 19),
      endTime: at(8, 22),
    },
    {
      club: "Photography Club",
      room: "C-301",
      bookedBy: "student@college.edu",
      title: "Darkroom Basics",
      purpose: "Intro to film developing",
      startTime: at(10, 10),
      endTime: at(10, 12),
    },
    {
      club: "Drama Society",
      room: "Sathe Hall",
      bookedBy: "clubadmin@college.edu",
      title: "Script Reading",
      purpose: "Read-through of the semester play",
      startTime: at(-1, 18),
      endTime: at(-1, 20),
    },
    {
      club: "Coding Club",
      room: "C-102",
      bookedBy: "student@college.edu",
      title: "DSA Bootcamp — Graphs",
      purpose: "Graph algorithms deep dive",
      startTime: at(-3, 10),
      endTime: at(-3, 13),
    },
    {
      club: "Robotics Club",
      room: "C-106",
      bookedBy: "clubadmin@college.edu",
      title: "PCB Design Session",
      purpose: "KiCad workshop",
      startTime: at(-6, 14),
      endTime: at(-6, 16),
    },
  ];

  for (const b of bookingDefs) {
    const existing = await prisma.booking.findFirst({
      where: {
        title: b.title,
        clubId: clubByName[b.club],
        classroomId: roomByName[b.room],
      },
    });
    if (!existing) {
      await prisma.booking.create({
        data: {
          clubId: clubByName[b.club],
          classroomId: roomByName[b.room],
          bookedById: userByEmail[b.bookedBy],
          title: b.title,
          purpose: b.purpose,
          startTime: b.startTime,
          endTime: b.endTime,
          status: "CONFIRMED",
        },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
