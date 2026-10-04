import { NextFunction, Request, Response, Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { hashPassword, signToken, verifyPassword } from "../utils/auth";
import { requireAuth } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  memberships: {
    select: {
      clubId: true,
      role: true,
      club: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.UserSelect;

type UserWithMemberships = Prisma.UserGetPayload<{ select: typeof userSelect }>;

function userPayload(user: UserWithMemberships): UserWithMemberships {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    memberships: user.memberships ?? [],
  };
}

// POST /auth/register
router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw createError(400, "Email is already registered");

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        role: "STUDENT",
      },
      select: userSelect,
    });

    res.status(201).json({ token: signToken({ sub: user.id, role: user.role }), user: userPayload(user) });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { ...userSelect, passwordHash: true },
    });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw createError(401, "Invalid email or password");
    }

    res.json({ token: signToken({ sub: user.id, role: user.role }), user: userPayload(user) });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
router.get("/me", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: userSelect,
    });
    if (!user) throw createError(404, "User not found");
    res.json({ user: userPayload(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
