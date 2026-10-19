import { useCallback, useEffect, useMemo, useState } from "react";
import { listBookings, listClassrooms } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import type { Booking, Classroom } from "../types";
import { Alert, Badge, EmptyState, Spinner, btnSecondary, clubHex, formatDate, formatTime, inputClass } from "../components/ui";

const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fromKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Room type labels, e.g. SEMINAR_HALL -> Seminar Hall
const prettyType = (t: string) =>
  t.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const FREE_FILL = "var(--map-free)";
const FREE_STROKE = "var(--map-free-stroke)";
const OCCUPIED_FILL = "var(--map-occ)";
const OCCUPIED_STROKE = "var(--map-occ-stroke)";
const ACCENT = "#12808C";

interface MapTileDef { x: number; y: number; w: number; h: number; short: string; fs: number }

// Schematic campus map (SVG viewBox 0 0 100 82). Classrooms sit inside the
// main-building rectangle; Tilak Hall, Open Air Theatre and all other
// facilities are drawn as separate rectangles outside it.
const MAP_BUILDINGS = [
  { label: "Main Building", x: 2, y: 4, w: 66, h: 50 },
  { label: "Library", x: 52, y: 60, w: 18, h: 16 },
];

const CX = [4.8, 13.6, 22.4, 31.2, 40.0, 48.8, 57.6];
const CY = [12, 24, 36];
const cls = (col: number, row: number, short: string): MapTileDef => ({
  x: CX[col], y: CY[row], w: 7.6, h: 10, short, fs: 3.6,
});

const MAP_LAYOUT: Record<string, MapTileDef> = {
  "Classroom 1": cls(0, 0, "1"),
  "Classroom 2": cls(1, 0, "2"),
  "Classroom 3": cls(2, 0, "3"),
  "Classroom 5": cls(3, 0, "5"),
  "Classroom 6": cls(4, 0, "6"),
  "Classroom 7": cls(5, 0, "7"),
  "Classroom 4": cls(6, 0, "4"),
  "Classroom 8": cls(0, 1, "8"),
  "Classroom 9": cls(1, 1, "9"),
  "Classroom 10": cls(2, 1, "10"),
  "Classroom 11": cls(3, 1, "11"),
  "Classroom 12": cls(4, 1, "12"),
  "Classroom 13": cls(5, 1, "13"),
  "Classroom 14": cls(6, 1, "14"),
  "Classroom 15": cls(0, 2, "15"),
  "Classroom 16": cls(1, 2, "16"),
  "Classroom 17": cls(2, 2, "17"),
  "Classroom 18": cls(3, 2, "18"),
  "Classroom 20": cls(4, 2, "20"),
  "N2 Classroom": cls(5, 2, "N2"),
  "Electronics PG Classroom": cls(6, 2, "PG"),
  "Tilak Hall": { x: 72, y: 4, w: 26, h: 16, short: "Tilak Hall", fs: 3 },
  "Sathe Hall": { x: 72, y: 24, w: 26, h: 12, short: "Sathe Hall", fs: 2.8 },
  "OAT": { x: 2, y: 60, w: 30, h: 16, short: "Open Air Theatre", fs: 2.6 },
  "CSE Seminar Hall": { x: 72, y: 40, w: 26, h: 6, short: "CSE Seminar Hall", fs: 2.2 },
  "Mechanical Production Seminar Hall": { x: 72, y: 47, w: 26, h: 6, short: "Mech. Production", fs: 2.2 },
  "Design Seminar Hall": { x: 72, y: 54, w: 26, h: 6, short: "Design Seminar", fs: 2.2 },
  "Electrical Seminar Hall": { x: 72, y: 61, w: 26, h: 6, short: "Electrical Seminar", fs: 2.2 },
  "Civil Seminar Hall": { x: 72, y: 68, w: 26, h: 6, short: "Civil Seminar", fs: 2.2 },
  "Main CCF": { x: 34, y: 60, w: 16, h: 7, short: "Main CCF", fs: 2.2 },
  "Mini CCF": { x: 34, y: 69, w: 16, h: 7, short: "Mini CCF", fs: 2.2 },
  "Library Stairs Area": { x: 53, y: 65, w: 16, h: 5, short: "Stairs Area", fs: 2 },
  "Study Rooms": { x: 53, y: 71, w: 16, h: 4.5, short: "Study Rooms", fs: 2 },
};

function BookingRow({ booking }: { booking: Booking }) {
  const { user } = useAuth();
  const color = clubHex(booking.club.id);
  const isStudent = user?.role === "STUDENT";
  return (
    <li className="rounded-xl border border-line bg-canvas p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink">
          {formatDate(booking.startTime)} · {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
        </p>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-bodytext shadow-sm">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
          {booking.club.name}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-ink">{booking.title}</p>
      {booking.purpose && <p className="text-sm text-muted">{booking.purpose}</p>}
      {!isStudent && <p className="mt-1 text-xs text-muted">Booked by {booking.bookedBy.name}</p>}
    </li>
  );
}

export default function MapPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT";
  const [rooms, setRooms] = useState<Classroom[] | null>(null);
  const [dateKey, setDateKey] = useState(() => toKey(new Date()));
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [roomBookings, setRoomBookings] = useState<Booking[] | null>(null);
  const [roomBookingsError, setRoomBookingsError] = useState<string | null>(null);

  const isToday = dateKey === toKey(new Date());

  const loadDay = useCallback((key: string) => {
    const dayStart = fromKey(key);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = fromKey(key);
    dayEnd.setHours(23, 59, 59, 999);
    return listBookings({ from: dayStart.toISOString(), to: dayEnd.toISOString(), upcoming: false })
      .then(setDayBookings)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    listClassrooms()
      .then(setRooms)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    setDayBookings([]);
    loadDay(dateKey);
    const timer = setInterval(() => loadDay(dateKey), 60_000);
    return () => clearInterval(timer);
  }, [dateKey, loadDay]);

  // fetch ALL bookings whenever a room is selected
  useEffect(() => {
    if (!selectedName || !rooms) {
      setRoomBookings(null);
      return;
    }
    const room = rooms.find((r) => r.name === selectedName);
    if (!room) {
      setRoomBookings([]);
      return;
    }
    setRoomBookings(null);
    setRoomBookingsError(null);
    listBookings({ classroomId: room.id, upcoming: false })
      .then((b) => setRoomBookings(b.filter((x) => x.status === "CONFIRMED")))
      .catch((e: Error) => setRoomBookingsError(e.message));
  }, [selectedName, rooms]);

  // rooms with any booking on the selected date
  const bookedNames = useMemo(() => new Set(dayBookings.map((b) => b.classroom.name)), [dayBookings]);

  // rooms in use at this very moment (only meaningful for today)
  const liveByName = useMemo(() => {
    const map = new Map<string, Booking>();
    if (!isToday) return map;
    const now = new Date();
    for (const b of dayBookings) {
      if (new Date(b.startTime) <= now && new Date(b.endTime) >= now) {
        map.set(b.classroom.name, b);
      }
    }
    return map;
  }, [dayBookings, isToday]);

  const selectedRoom = useMemo(
    () => rooms?.find((r) => r.name === selectedName) ?? null,
    [rooms, selectedName]
  );

  const selectedDayBookings = useMemo(
    () => dayBookings.filter((b) => b.classroom.name === selectedName),
    [dayBookings, selectedName]
  );

  const { upcomingBookings, pastBookings } = useMemo(() => {
    const now = new Date();
    const upcoming = (roomBookings ?? [])
      .filter((b) => new Date(b.endTime) >= now)
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));
    const past = (roomBookings ?? [])
      .filter((b) => new Date(b.endTime) < now)
      .sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime));
    return { upcomingBookings: upcoming, pastBookings: past };
  }, [roomBookings]);

  const currentBooking = selectedName ? liveByName.get(selectedName) ?? null : null;
  const selectedBooked = selectedName ? bookedNames.has(selectedName) : false;

  const shiftDay = (delta: number) => {
    const d = fromKey(dateKey);
    d.setDate(d.getDate() + delta);
    setDateKey(toKey(d));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Campus Map</h1>
          <p className="text-sm text-muted">
            Pick a date to check which rooms are free or booked. Click any room for its full schedule.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <button onClick={() => shiftDay(-1)} className={btnSecondary} aria-label="Previous day">
            ←
          </button>
          <div className="w-40">
            <input
              type="date"
              aria-label="Select date"
              className={inputClass}
              value={dateKey}
              onChange={(e) => {
                if (e.target.value) setDateKey(e.target.value);
              }}
            />
          </div>
          <button onClick={() => shiftDay(1)} className={btnSecondary} aria-label="Next day">
            →
          </button>
          <button onClick={() => setDateKey(toKey(new Date()))} className={btnSecondary}>
            Today
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-bodytext">
        <span className="font-semibold text-ink">{isToday ? "Today" : formatDate(fromKey(dateKey).toISOString())}</span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm border"
            style={{ background: FREE_FILL, borderColor: FREE_STROKE }}
          />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm border"
            style={{ background: OCCUPIED_FILL, borderColor: OCCUPIED_STROKE }}
          />
          Booked
        </span>
        {isToday && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm border-2"
              style={{ background: OCCUPIED_FILL, borderColor: "#b91c1c" }}
            />
            In use now
          </span>
        )}
      </div>

      {error && <Alert kind="error" message={error} />}

      {rooms === null && !error ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Campus map */}
          <div className="card p-4 lg:col-span-2">
            <svg viewBox="0 0 100 82" className="w-full rounded-xl" style={{ background: "var(--map-bg)" }} role="img" aria-label="Campus map">
              {MAP_BUILDINGS.map((b) => (
                <g key={b.label}>
                  <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="2" style={{ fill: "var(--map-shell)", stroke: "var(--map-shell-stroke)" }} strokeWidth="1" />
                  <text x={b.x + 2} y={b.y + 3.6} fontSize="3" fontWeight="700" style={{ fill: "var(--map-label)" }}>
                    {b.label}
                  </text>
                </g>
              ))}
              {(rooms ?? []).map((r) => {
                const t = MAP_LAYOUT[r.name];
                if (!t) return null;
                const booked = bookedNames.has(r.name);
                const live = liveByName.has(r.name);
                const isSel = r.name === selectedName;
                return (
                  <g key={r.id} onClick={() => setSelectedName(r.name)} style={{ cursor: "pointer" }}>
                    <title>{`${r.name} (${prettyType(r.type)}) — ${live ? "in use now" : booked ? "booked" : "available"}`}</title>
                    <rect
                      x={t.x} y={t.y} width={t.w} height={t.h} rx="1.5"
                      fill={live || booked ? OCCUPIED_FILL : FREE_FILL}
                      stroke={isSel ? ACCENT : live ? "#b91c1c" : booked ? OCCUPIED_STROKE : FREE_STROKE}
                      strokeWidth={isSel || live ? 1.6 : 0.8}
                    />
                    <text
                      x={t.x + t.w / 2} y={t.y + t.h / 2 + t.fs * 0.35}
                      textAnchor="middle" fontSize={t.fs} fontWeight="600" style={{ fill: "var(--map-label)" }} pointerEvents="none"
                    >
                      {t.short}
                    </text>
                  </g>
                );
              })}
            </svg>
            {rooms && rooms.filter((r) => !MAP_LAYOUT[r.name]).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {rooms
                  .filter((r) => !MAP_LAYOUT[r.name])
                  .map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedName(r.name)}
                      className={`rounded-lg border bg-surface px-3 py-1.5 text-xs font-medium text-ink ${
                        r.name === selectedName
                          ? "border-accent ring-2 ring-accent/25"
                          : "border-line hover:border-accent/40"
                      }`}
                    >
                      {r.name}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Side panel — all bookings for the selected room */}
          <div className="card p-5">
            {!selectedName ? (
              <EmptyState title="Select a room" hint="Click any room to see all its bookings." />
            ) : !selectedRoom ? (
              <EmptyState title={selectedName} hint="This room is not registered in the system yet." />
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-ink">{selectedRoom.name}</h2>
                    <p className="text-sm text-muted">
                      {selectedRoom.building}{selectedRoom.capacity > 0 ? ` · ${selectedRoom.capacity} seats` : ""}
                    </p>
                  </div>
                  <Badge text={selectedBooked ? "BOOKED" : "AVAILABLE"} />
                </div>

                {currentBooking && (
                  <div className="rounded-xl bg-red-50 p-3 dark:bg-red-500/10">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Now in use</p>
                    <p className="mt-1 text-sm font-medium text-ink">{currentBooking.title}</p>
                    <p className="text-sm text-bodytext">by {currentBooking.club.name}</p>
                    <p className="mt-1 text-sm font-medium text-emerald-700">
                      Free at {formatTime(currentBooking.endTime)}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="mb-2 text-sm font-bold text-ink">
                    {isToday ? "Today's bookings" : `Bookings on ${formatDate(fromKey(dateKey).toISOString())}`}{" "}
                    ({selectedDayBookings.length})
                  </h3>
                  {selectedDayBookings.length === 0 ? (
                    <p className="text-sm text-muted">
                      {isToday ? "Nothing scheduled today." : "This room is free on this date."}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedDayBookings.map((b) => (
                        <BookingRow key={b.id} booking={b} />
                      ))}
                    </ul>
                  )}
                </div>

                {roomBookingsError && <Alert kind="error" message={roomBookingsError} />}
                {roomBookings === null && !roomBookingsError ? (
                  <Spinner />
                ) : (
                  <>
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-ink">
                        Upcoming bookings ({upcomingBookings.length})
                      </h3>
                      {upcomingBookings.length === 0 ? (
                        <p className="text-sm text-muted">Nothing scheduled.</p>
                      ) : (
                        <ul className="space-y-2">
                          {upcomingBookings.map((b) => (
                            <BookingRow key={b.id} booking={b} />
                          ))}
                        </ul>
                      )}
                    </div>
                    {!isStudent && (
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-ink">
                        Past bookings ({pastBookings.length})
                      </h3>
                      {pastBookings.length === 0 ? (
                        <p className="text-sm text-muted">No history yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {pastBookings.map((b) => (
                            <BookingRow key={b.id} booking={b} />
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  </>
                )}

                <button
                  onClick={() => setSelectedName(null)}
                  className="text-sm font-semibold text-accent hover:underline"
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}