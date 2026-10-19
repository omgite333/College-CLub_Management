import { NextFunction, Request, Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

const listQuerySchema = z.object({
  clubId: z.string().cuid().optional(),
});

// GET /events?clubId=...
// Lists club events (imported from the clubs spreadsheet). Dated events first,
// tentative ones (no concrete date) last.
router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clubId } = listQuerySchema.parse(req.query);
    const events = await prisma.event.findMany({
      where: clubId ? { clubId } : undefined,
      include: { club: { select: { id: true, name: true } } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

export default router;
