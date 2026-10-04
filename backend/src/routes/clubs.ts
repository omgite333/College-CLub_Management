import { NextFunction, Request, Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import { isClubAdmin } from "../utils/permissions";

const router = Router();

const createClubSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  logoUrl: z.string().url("logoUrl must be a valid URL").optional(),
});

const updateClubSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  logoUrl: z.string().url("logoUrl must be a valid URL").nullable().optional(),
});

const addMemberSchema = z.object({
  email: z.string().email().optional(),
  userId: z.string().cuid().optional(),
  role: z.enum(["STUDENT", "CLUB_ADMIN"]).default("STUDENT"),
}).refine((d) => d.email || d.userId, { message: "Either email or userId is required" });

// GET /clubs
router.get("/", requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const clubs = await prisma.club.findMany({
      include: { _count: { select: { memberships: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ clubs });
  } catch (err) {
    next(err);
  }
});

// POST /clubs (SUPER_ADMIN)
router.post("/", requireAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createClubSchema.parse(req.body);
    const exists = await prisma.club.findUnique({ where: { name: data.name } });
    if (exists) throw createError(409, "A club with this name already exists");
    const club = await prisma.club.create({ data });
    res.status(201).json({ club });
  } catch (err) {
    next(err);
  }
});

// GET /clubs/:id
router.get("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const club = await prisma.club.findUnique({
      where: { id: req.params.id },
      include: {
        memberships: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
        bookings: {
          where: { status: "CONFIRMED", endTime: { gte: new Date() } },
          select: {
            id: true,
            title: true,
            purpose: true,
            startTime: true,
            endTime: true,
            classroom: { select: { id: true, name: true, building: true } },
          },
          orderBy: { startTime: "asc" },
        },
      },
    });
    if (!club) throw createError(404, "Club not found");

    const { memberships, bookings, ...clubData } = club;
    res.json({
      club: clubData,
      members: memberships.map((m) => ({
        membershipId: m.id,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      upcomingBookings: bookings,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /clubs/:id
router.patch("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clubId = req.params.id;
    const data = updateClubSchema.parse(req.body);

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw createError(404, "Club not found");

    const allowed =
      req.user!.role === "SUPER_ADMIN" ||
      (await isClubAdmin(req.user!.id, clubId));
    if (!allowed) throw createError(403, "You are not an admin of this club");

    if (data.name && data.name !== club.name) {
      const clash = await prisma.club.findUnique({ where: { name: data.name } });
      if (clash) throw createError(409, "A club with this name already exists");
    }

    const updated = await prisma.club.update({ where: { id: clubId }, data });
    res.json({ club: updated });
  } catch (err) {
    next(err);
  }
});

// POST /clubs/:id/members
router.post("/:id/members", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clubId = req.params.id;
    const { email, userId, role } = addMemberSchema.parse(req.body);

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw createError(404, "Club not found");

    const callerIsSuper = req.user!.role === "SUPER_ADMIN";
    const callerIsClubAdmin =
      !callerIsSuper && (await isClubAdmin(req.user!.id, clubId));

    if (!callerIsSuper && !callerIsClubAdmin) {
      throw createError(403, "You are not an admin of this club");
    }
    if (role === "CLUB_ADMIN" && !callerIsSuper) {
      throw createError(403, "Only a super admin can grant CLUB_ADMIN access");
    }

    const target = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findUnique({ where: { email: email! } });
    if (!target) throw createError(404, "User not found");

    const exists = await prisma.membership.findUnique({
      where: { userId_clubId: { userId: target.id, clubId } },
    });
    if (exists) throw createError(409, "User is already a member of this club");

    const membership = await prisma.membership.create({
      data: { userId: target.id, clubId, role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (role === "CLUB_ADMIN" && target.role !== "CLUB_ADMIN") {
      await prisma.user.update({ where: { id: target.id }, data: { role: "CLUB_ADMIN" } });
    }

    res.status(201).json({ membership });
  } catch (err) {
    next(err);
  }
});

// DELETE /clubs/:id/members/:membershipId
router.delete("/:id/members/:membershipId", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: clubId, membershipId } = req.params;

    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: { user: { select: { id: true, role: true } } },
    });
    if (!membership || membership.clubId !== clubId) {
      throw createError(404, "Membership not found");
    }

    const callerIsSuper = req.user!.role === "SUPER_ADMIN";
    const callerIsClubAdmin =
      !callerIsSuper && (await isClubAdmin(req.user!.id, clubId));

    if (!callerIsSuper && !callerIsClubAdmin) {
      throw createError(403, "You are not an admin of this club");
    }
    if (!callerIsSuper && membership.role === "CLUB_ADMIN") {
      throw createError(403, "Only a super admin can remove a CLUB_ADMIN member");
    }

    await prisma.membership.delete({ where: { id: membershipId } });

    // Downgrade global role if the user no longer administers any club.
    const remaining = await prisma.membership.count({
      where: { userId: membership.userId, role: "CLUB_ADMIN" },
    });
    if (remaining === 0 && membership.user.role === "CLUB_ADMIN") {
      await prisma.user.update({
        where: { id: membership.userId },
        data: { role: "STUDENT" },
      });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
