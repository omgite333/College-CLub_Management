import { NextFunction, Request, Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";

const router = Router();
router.use(requireAuth, requireRole("SUPER_ADMIN"));

const roleChangeSchema = z.object({
  role: z.enum(["STUDENT", "CLUB_ADMIN"]),
  clubId: z.string().cuid().optional(),
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  memberships: {
    select: {
      id: true,
      role: true,
      club: { select: { id: true, name: true } },
    },
  },
} as const;

// GET /users?search=
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const users = await prisma.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      select: userSelect,
      orderBy: { name: "asc" },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// PATCH /users/:id/role
router.patch("/:id/role", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, clubId } = roleChangeSchema.parse(req.body);
    const targetId = req.params.id;

    if (targetId === req.user!.id) {
      throw createError(403, "You cannot change your own role");
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw createError(404, "User not found");

    if (role === "CLUB_ADMIN") {
      if (!clubId) throw createError(400, "clubId is required to grant CLUB_ADMIN access");
      const club = await prisma.club.findUnique({ where: { id: clubId } });
      if (!club) throw createError(404, "Club not found");

      await prisma.membership.upsert({
        where: { userId_clubId: { userId: targetId, clubId } },
        update: { role: "CLUB_ADMIN" },
        create: { userId: targetId, clubId, role: "CLUB_ADMIN" },
      });
      await prisma.user.update({ where: { id: targetId }, data: { role: "CLUB_ADMIN" } });
    } else {
      // Demote: remove every CLUB_ADMIN membership this user holds.
      await prisma.membership.deleteMany({
        where: { userId: targetId, role: "CLUB_ADMIN" },
      });
      await prisma.user.update({ where: { id: targetId }, data: { role: "STUDENT" } });
    }

    const user = await prisma.user.findUnique({ where: { id: targetId }, select: userSelect });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
