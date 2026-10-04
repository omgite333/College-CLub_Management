import { NextFunction, Request, Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";

const router = Router();

const createClassroomSchema = z.object({
  name: z.string().min(1, "Name is required"),
  building: z.string().min(1, "Building is required"),
  floor: z.number().int(),
  capacity: z.number().int().positive("Capacity must be positive"),
  type: z.string().default("CLASSROOM"),
  x: z.number().default(50),
  y: z.number().default(50),
});

const updateClassroomSchema = createClassroomSchema.partial();

// GET /classrooms
router.get("/", requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const classrooms = await prisma.classroom.findMany({
      orderBy: [{ building: "asc" }, { floor: "asc" }, { name: "asc" }],
    });
    res.json({ classrooms });
  } catch (err) {
    next(err);
  }
});

// GET /classrooms/:id
router.get("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: req.params.id },
      include: {
        bookings: {
          where: { status: "CONFIRMED", endTime: { gte: new Date() } },
          select: {
            id: true,
            title: true,
            purpose: true,
            startTime: true,
            endTime: true,
            club: { select: { id: true, name: true } },
            bookedBy: { select: { name: true } },
          },
          orderBy: { startTime: "asc" },
        },
      },
    });
    if (!classroom) throw createError(404, "Classroom not found");

    const { bookings, ...room } = classroom;
    res.json({ classroom: room, upcomingBookings: bookings });
  } catch (err) {
    next(err);
  }
});

// POST /classrooms (SUPER_ADMIN)
router.post("/", requireAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createClassroomSchema.parse(req.body);
    const exists = await prisma.classroom.findUnique({ where: { name: data.name } });
    if (exists) throw createError(409, "A classroom with this name already exists");
    const classroom = await prisma.classroom.create({ data });
    res.status(201).json({ classroom });
  } catch (err) {
    next(err);
  }
});

// PATCH /classrooms/:id (SUPER_ADMIN)
router.patch("/:id", requireAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateClassroomSchema.parse(req.body);
    const classroom = await prisma.classroom.findUnique({ where: { id: req.params.id } });
    if (!classroom) throw createError(404, "Classroom not found");

    if (data.name && data.name !== classroom.name) {
      const clash = await prisma.classroom.findUnique({ where: { name: data.name } });
      if (clash) throw createError(409, "A classroom with this name already exists");
    }

    const updated = await prisma.classroom.update({ where: { id: req.params.id }, data });
    res.json({ classroom: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
