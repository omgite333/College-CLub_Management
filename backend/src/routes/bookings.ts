import { NextFunction, Request, Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import { isClubAdmin } from "../utils/permissions";

const router = Router();

const datetimeSchema = z.coerce.date();

const createBookingSchema = z.object({
  clubId: z.string().cuid(),
  classroomId: z.string().cuid(),
  title: z.string().min(1, "Title is required"),
  purpose: z.string().optional(),
  startTime: datetimeSchema,
  endTime: datetimeSchema,
});

const updateBookingSchema = z.object({
  title: z.string().min(1).optional(),
  purpose: z.string().nullable().optional(),
  startTime: datetimeSchema.optional(),
  endTime: datetimeSchema.optional(),
  classroomId: z.string().cuid().optional(),
});

function validateTimes(start: Date, end: Date): void {
  if (end <= start) throw createError(400, "endTime must be after startTime");
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  if (start.getTime() < fiveMinutesAgo) {
    throw createError(400, "Cannot book in the past");
  }
}

async function findConflict(
  classroomId: string,
  start: Date,
  end: Date,
  excludeId?: string
) {
  return prisma.booking.findFirst({
    where: {
      classroomId,
      status: "CONFIRMED",
      startTime: { lt: end },
      endTime: { gt: start },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: { club: { select: { name: true } } },
  });
}

// GET /bookings
router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clubId, classroomId, from, to, upcoming, includeCancelled } = req.query;

    const bookings = await prisma.booking.findMany({
      where: {
        ...(typeof clubId === "string" && clubId ? { clubId } : {}),
        ...(typeof classroomId === "string" && classroomId ? { classroomId } : {}),
        ...(upcoming === "true" ? { endTime: { gte: new Date() } } : {}),
        ...(includeCancelled === "true" ? {} : { status: "CONFIRMED" }),
        // `from`/`to` select bookings OVERLAPPING the window, so events that are
        // still running when the window opens/closes are included.
        ...(typeof from === "string" && from ? { endTime: { gte: new Date(from) } } : {}),
        ...(typeof to === "string" && to ? { startTime: { lte: new Date(to) } } : {}),
      },
      include: {
        club: { select: { id: true, name: true } },
        classroom: { select: { id: true, name: true, building: true } },
        bookedBy: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "asc" },
    });

    res.json({ bookings });
  } catch (err) {
    next(err);
  }
});

// POST /bookings
router.post("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createBookingSchema.parse(req.body);

    const canBook =
      req.user!.role === "SUPER_ADMIN" ||
      (await isClubAdmin(req.user!.id, data.clubId, req.user!.role));
    if (!canBook) throw createError(403, "You are not an admin of this club");

    validateTimes(data.startTime, data.endTime);

    const conflict = await findConflict(data.classroomId, data.startTime, data.endTime);
    if (conflict) {
      res.status(409).json({
        error: "Classroom already booked for this time slot",
        conflict: {
          id: conflict.id,
          title: conflict.title,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          club: conflict.club,
        },
      });
      return;
    }

    const booking = await prisma.booking.create({
      data: {
        clubId: data.clubId,
        classroomId: data.classroomId,
        bookedById: req.user!.id,
        title: data.title,
        purpose: data.purpose,
        startTime: data.startTime,
        endTime: data.endTime,
        status: "CONFIRMED",
      },
      include: {
        club: { select: { id: true, name: true } },
        classroom: { select: { id: true, name: true, building: true } },
      },
    });

    res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
});

// PATCH /bookings/:id
router.patch("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateBookingSchema.parse(req.body);
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) throw createError(404, "Booking not found");

    const canEdit =
      req.user!.role === "SUPER_ADMIN" ||
      (await isClubAdmin(req.user!.id, booking.clubId, req.user!.role));
    if (!canEdit) throw createError(403, "You are not an admin of this club");

    const newStart = data.startTime ?? booking.startTime;
    const newEnd = data.endTime ?? booking.endTime;
    const newRoom = data.classroomId ?? booking.classroomId;
    validateTimes(newStart, newEnd);

    const conflict = await findConflict(newRoom, newStart, newEnd, booking.id);
    if (conflict) {
      res.status(409).json({
        error: "Classroom already booked for this time slot",
        conflict: {
          id: conflict.id,
          title: conflict.title,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          club: conflict.club,
        },
      });
      return;
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        title: data.title,
        purpose: data.purpose,
        startTime: data.startTime,
        endTime: data.endTime,
        classroomId: data.classroomId,
      },
      include: {
        club: { select: { id: true, name: true } },
        classroom: { select: { id: true, name: true, building: true } },
      },
    });

    res.json({ booking: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /bookings/:id (soft-cancel)
router.delete("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) throw createError(404, "Booking not found");

    const canCancel =
      req.user!.role === "SUPER_ADMIN" ||
      (await isClubAdmin(req.user!.id, booking.clubId, req.user!.role));
    if (!canCancel) throw createError(403, "You are not an admin of this club");

    const cancelled = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    });

    res.json({ booking: cancelled });
  } catch (err) {
    next(err);
  }
});

export default router;
