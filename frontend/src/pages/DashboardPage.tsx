import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { listBookings, listClassrooms, listClubs } from "../lib/api";
import type { Booking, Classroom, ClubSummary } from "../types";
import { EmptyState, Spinner, clubHex, formatTime } from "../components/ui";

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[20px] bg-mist/35 p-5">
      <p className="text-3xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-sm text-bodytext/70">{label}</p>
    </div>
  );
}

function SectionCard({
  title,
  linkTo,
  linkLabel = "View all ›",
  children,
}: {
  title: string;
  linkTo?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">{title}</h2>
        {linkTo && (
          <Link to={linkTo} className="text-sm font-semibold text-accent hover:underline">
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function ClubTile({ name, clubId }: { name: string; clubId: string }) {
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
      style={{ background: clubHex(clubId) }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<ClubSummary[] | null>(null);
  const [rooms, setRooms] = useState<Classroom[] | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    const to = new Date(now);
    to.setDate(to.getDate() + 30);
    listClubs()
      .then(setClubs)
      .catch(() => setClubs([]));
    listClassrooms()
      .then(setRooms)
      .catch(() => setRooms([]));
    listBookings({ from: from.toISOString(), to: to.toISOString(), upcoming: false })
      .then(setBookings)
      .catch(() => setBookings([]));
  }, []);

  const loading = clubs === null || rooms === null || bookings === null;

  const stats = useMemo(() => {
    if (!clubs || !rooms || !bookings) return null;
    const now = new Date();
    const thisMonth = bookings.filter((b) => {
      const d = new Date(b.startTime);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    return {
      clubs: clubs.length,
      rooms: rooms.length,
      monthBookings: thisMonth,
    };
  }, [clubs, rooms, bookings]);

  const ongoing = useMemo(() => {
    const now = new Date();
    return (bookings ?? [])
      .filter((b) => new Date(b.startTime) <= now && new Date(b.endTime) >= now)
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))
      .slice(0, 5);
  }, [bookings]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return (bookings ?? [])
      .filter((b) => new Date(b.startTime) > now)
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))
      .slice(0, 5);
  }, [bookings]);

  const recent = useMemo(
    () =>
      [...(bookings ?? [])]
        .sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime))
        .slice(0, 8),
    [bookings]
  );

  const firstName = user?.name?.split(" ")[0] ?? "there";
  // Booking rights come from holding a CLUB_ADMIN membership, not the account role.
  const canBook = user?.memberships.some((m) => m.role === "CLUB_ADMIN") === true;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Welcome back, {firstName}</h1>
        <p className="text-sm text-muted">Here&apos;s what&apos;s happening across your clubs.</p>
      </div>

      {loading || !stats ? (
        <Spinner />
      ) : (
        <>
          {/* Row 1: stats + CTA */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total clubs" value={stats.clubs} />
            <StatCard label="Bookings this month" value={stats.monthBookings} />
            <StatCard label="Total classrooms" value={stats.rooms} />
            <Link
              to={canBook ? "/bookings?new=1" : "/clubs"}
              className="flex flex-col items-center justify-center rounded-[20px] bg-ink p-5 text-white transition-transform hover:scale-[1.02]"
            >
              <span className="text-4xl font-bold leading-none">+</span>
              <span className="mt-2 text-sm font-semibold">{canBook ? "New Booking" : "Browse Clubs"}</span>
            </Link>
          </div>

          {/* Row 2: ongoing / upcoming */}
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard title="Ongoing bookings" linkTo="/bookings">
              {ongoing.length === 0 ? (
                <EmptyState title="Nothing happening right now" />
              ) : (
                <ul className="space-y-3">
                  {ongoing.map((b) => (
                    <li key={b.id} className="flex items-center gap-3">
                      <ClubTile name={b.club.name} clubId={b.club.id} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{b.title}</p>
                        <p className="truncate text-xs text-muted">
                          {b.club.name} · {b.classroom.name}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-ink">
                          {formatTime(b.startTime)} – {formatTime(b.endTime)}
                        </p>
                        <p className="text-xs font-medium text-accent">ongoing</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Upcoming bookings" linkTo="/bookings">
              {upcoming.length === 0 ? (
                <EmptyState title="No upcoming bookings" />
              ) : (
                <ul className="space-y-3">
                  {upcoming.map((b) => {
                    const d = new Date(b.startTime);
                    return (
                      <li key={b.id} className="flex items-center gap-3">
                        <ClubTile name={b.club.name} clubId={b.club.id} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-ink">{b.title}</p>
                          <p className="truncate text-xs text-muted">
                            {formatTime(b.startTime)} · {b.classroom.name}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xl font-bold leading-none text-ink">{d.getDate()}</p>
                          <p className="text-xs text-muted">
                            {d.toLocaleDateString(undefined, { month: "short" })}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          </div>

          {/* Row 3: all bookings table */}
          <SectionCard title="All bookings" linkTo="/bookings">
            {recent.length === 0 ? (
              <EmptyState title="No bookings yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-muted">
                      <th className="py-2 pr-4">Title</th>
                      <th className="py-2 pr-4">Club</th>
                      <th className="py-2 pr-4">Room</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((b) => (
                      <tr key={b.id} className="border-t border-slate-100">
                        <td className="py-2.5 pr-4 font-medium text-ink">{b.title}</td>
                        <td className="py-2.5 pr-4 text-bodytext">{b.club.name}</td>
                        <td className="py-2.5 pr-4 text-bodytext">{b.classroom.name}</td>
                        <td className="py-2.5 pr-4 text-bodytext">{shortDate(b.startTime)}</td>
                        <td className="py-2.5 text-bodytext">
                          {formatTime(b.startTime)} – {formatTime(b.endTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}