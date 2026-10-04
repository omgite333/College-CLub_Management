import { prisma } from "../db";

export type AppRole = "STUDENT" | "CLUB_ADMIN" | "SUPER_ADMIN";

/**
 * Does this user hold a CLUB_ADMIN membership for this specific club?
 *
 * Deliberately does NOT grant access to SUPER_ADMIN: club content (bookings)
 * is owned by that club's admins, while SUPER_ADMIN handles system-level work
 * (users, roles, clubs, classrooms). Routes that SUPER_ADMIN may also access
 * check `req.user.role === "SUPER_ADMIN"` explicitly at the call site.
 */
export async function isClubAdmin(userId: string, clubId: string): Promise<boolean> {
  const membership = await prisma.membership.findUnique({
    where: { userId_clubId: { userId, clubId } },
    select: { role: true },
  });
  return membership?.role === "CLUB_ADMIN";
}