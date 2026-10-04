import { prisma } from "../db";

export type AppRole = "STUDENT" | "CLUB_ADMIN" | "SUPER_ADMIN";

/**
 * A user can manage a club's data/bookings if they are SUPER_ADMIN,
 * or they hold a CLUB_ADMIN membership for that club.
 */
export async function isClubAdmin(
  userId: string,
  clubId: string,
  userRole?: AppRole
): Promise<boolean> {
  if (userRole === "SUPER_ADMIN") return true;

  const user = userRole
    ? null
    : await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if ((userRole ?? user?.role) === "SUPER_ADMIN") return true;

  const membership = await prisma.membership.findUnique({
    where: { userId_clubId: { userId, clubId } },
    select: { role: true },
  });
  return membership?.role === "CLUB_ADMIN";
}
